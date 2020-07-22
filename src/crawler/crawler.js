const async = require('async');
const Validation = require('../helpers/validation')
const ContactList = require('./contact-list')
const Contact = require('./../contact/contact')

module.exports = class Crawler {

    constructor(kademliaNode) {
        this._kademliaNode = kademliaNode;

        this._updateContactQueue = async.queue(
            (task, cb) => this._updateContactWorker(task, cb),
            1
        );

    }

    /**
     * The search begins by selecting alpha contacts from the non-empty k-bucket closest
     * to the bucket appropriate to the key being searched on. If there are fewer than
     * alpha contacts in that bucket, contacts are selected from other buckets.
     * The contact closest to the target key, closestNode, is noted.
     *
     * The first alpha contacts selected are used to create a shortlist for the search.
     *
     * The node then sends parallel, asynchronous FIND_NODE RPCs to the alpha contacts in the shortlist.
     * Each contact, if it is live, should normally return k triples. If any of the alpha contacts
     * fails to reply, it is removed from the shortlist, at least temporarily.
     *
     * The node then fills the shortlist with contacts from the replies received. These are those
     * closest to the target. From the shortlist it selects another alpha contacts. The only
     * condition for this selection is that they have not already been contacted. Once again a FIND_NODE RPC
     * is sent to each in parallel.
     *
     * Each such parallel search updates closestNode, the closest node seen so far.
     *
     * The sequence of parallel searches is continued until either no node in the sets returned
     * is closer than the closest node already seen or the initiating node has accumulated k probed
     * and known to be active contacts.
     *
     * If a cycle doesn't find a closer node, if closestNode is unchanged, then the initiating node
     * sends a FIND_NOCE RPC to each of the k closest nodes that it has not already queried.
     *
     * At the end of this process, the node will have accumulated a set of k active contacts or
     * (if the RPC was FIND_VALUE) may have found a data value. Either a set of triples or the value
     * is returned to the caller.
     *
     * @param key
     * @param cb
     * @returns {*}
     */
    iterativeFindNode(key, cb){

        const  err = Validation.checkIdentity(key);
        if (err) return cb(err);

        this._iterativeFind('', 'FIND_NODE', 'STORE', key, cb);

    }

    iterativeFindValue(table, key, cb){

        const err1 = Validation.checkIdentity(key);
        const err2 = Validation.checkTable(table);
        if (err1 || err2) return cb(err1||err2);

        this._kademliaNode._store.get(table.toString('hex'), key.toString('hex'), (err, out)=>{

            if (out) return cb(null, out);
            this._iterativeFind( table,'FIND_VALUE', 'STORE', key, cb);

        });

    }

    _sendStoreMissingKey( table, closestMissingValue, methodStore, key, data, cb ){

        let out;
        if (Array.isArray(data)) out = [table, key, ...data]
        else out = [table,  key, data];

        this._kademliaNode.rules.send( closestMissingValue, methodStore, out, cb);
    }

    _iterativeFind( table, method, methodStore, key, cb){

        const data = ( method === 'FIND_NODE' ) ? [key] : [table, key];

        this._kademliaNode.routingTable.bucketsLookups[ this._kademliaNode.routingTable.getBucketIndex( key ) ] = Date.now();

        const shortlist = new ContactList( key, this._kademliaNode.routingTable.getClosestToKey(key, global.KAD_OPTIONS.ALPHA_CONCURRENCY ) );
        let closest = shortlist.closest;

        let finished = false;

        function dispatchFindNode(contact, next){

            if (finished) return next(null, null)

            //mark this node as contacted so as to avoid repeats
            shortlist.contacted(contact);

            this._kademliaNode.rules.send(contact, method, data , (err, result) => {

                if (finished || err) return next(null, null);

                // mark this node as active to include it in any return values
                shortlist.responded(contact);

                if (!result || (Array.isArray(result) && !result.length)) {
                    next(null, result);
                } else
                //If the result is a contact/node list, just keep track of it
                if ( result[0] === 0 ){
                    const added = shortlist.add( result[1] );
                    //If it wasn't in the shortlist, we haven't added to the routing table, so do that now.
                    added.forEach(contact => this._updateContactFound(contact, () => null ));
                    next(null,  result[1]);
                } else {

                    //If we did get an item back, get the closest node we contacted
                    //who is missing the value and store a copy with them
                    const closestMissingValue = shortlist.active[0];

                    if (closestMissingValue) {
                        if (Array.isArray(result[1])){

                            async.eachLimit(result[1], global.KAD_OPTIONS.ALPHA_CONCURRENCY,
                                ( data, next ) => this._sendStoreMissingKey(table, closestMissingValue, methodStore, key, data, next ),
                                ()=>{});

                        } else
                        this._sendStoreMissingKey(table, closestMissingValue, methodStore, key,  result[1], ()=>{});
                    }

                    //  we found a value, so stop searching
                    finished = true;
                    cb(null, {  result: result[1], contact });
                    next(null,  result[1] );
                }

            })
        }

        function iterativeLookup(selection, continueLookup = true) {

            //nothing new to do
            if ( !selection.length )
                return cb(null, shortlist.active.slice(0, global.KAD_OPTIONS.BUCKET_COUNT_K) );

            async.each( selection, dispatchFindNode.bind(this),
                (err, results)=>{

                    if (finished) return;

                    // If we have reached at least K active nodes, or haven't found a
                    // closer node, even on our finishing trip, return to the caller
                    // the K closest active nodes.
                    if (shortlist.active.length >= global.KAD_OPTIONS.BUCKET_COUNT_K || (closest === shortlist.closest && !continueLookup) )
                        return cb(null, shortlist.active.slice(0, global.KAD_OPTIONS.BUCKET_COUNT_K));

                    // NB: we haven't discovered a closer node, call k uncalled nodes and
                    // NB: finish up
                    if (closest === shortlist.closest)
                        return iterativeLookup.call(this, shortlist.uncontacted.slice(0, global.KAD_OPTIONS.BUCKET_COUNT_K), false );

                    closest = shortlist.closest;

                    //continue the lookup with ALPHA close, uncontacted nodes
                    iterativeLookup.call(this, shortlist.uncontacted.slice(0, global.KAD_OPTIONS.ALPHA_CONCURRENCY), true );
                })

        }

        iterativeLookup.call(this, shortlist.uncontacted.slice(0, global.KAD_OPTIONS.ALPHA_CONCURRENCY), true);

    }

    _iterativeStoreValue( data, method, storeCb, cb){

        const key = data[1];

        let stored = 0, self = this;
        function dispatchSendStore(contacts, done){
            async.eachLimit( contacts, global.KAD_OPTIONS.ALPHA_CONCURRENCY,
                ( node, next ) => self._kademliaNode.rules[method]( node, data, (err, out)=>{
                    stored = err ? stored : stored + 1;
                    next(null, out);
                }),
                done)
        }

        async.waterfall([
            (next) => this.iterativeFindNode(  key, next),
            (contacts, next) => dispatchSendStore(contacts, next),
            (next) => storeCb(data, next),
        ], (err, out)=>{
            if (stored === 0 ) return cb(new Error("Failed to store key"));
            this._kademliaNode.routingTable.refresher.publishedByMe[key] = true;
            cb(null, stored);
        })

    }

    iterativeStoreValue(table, key, value, cb){
        return this._iterativeStoreValue(  [table, key, value], 'store', (data, next) => this._kademliaNode._store.put( table.toString('hex'), key.toString('hex'), value, next ), cb)
    }

    _updateContactFound(contact, cb){

        this._updateContactQueue.push( contact, (err, tail )=> {

            if (err) return cb(err, null);

            if (tail && typeof tail === "object"){
                this._kademliaNode.routingTable.removeContact(tail.contact);
                this._kademliaNode.routingTable.addContact(contact);
                return cb(null, contact);
            }
            cb(null, null);

        })
    }

    _updateContactWorker(contact, cb){

        if (contact.identity.equals( this._kademliaNode.contact.identity) )
            return cb(null, null);

        const [result, bucketIndex, bucketPosition, refreshed ] = this._kademliaNode.routingTable.addContact(contact);
        if (result || refreshed || (!result && !refreshed))
            return cb(null, true);

        const tail = this._kademliaNode.routingTable.buckets[bucketIndex].tail;
        if (tail.pingResponded && tail.pingLastCheck > ( Date.now() - 600000 ) )
            return cb( new Error("bucket full"),)

        this._kademliaNode.rules.sendPing(tail.contact, (err, out)=>{
            tail.pingLastCheck = Date.now();
            if (out){
                tail.pingResponded = true;
                cb(null, tail );
            }else {
                cb( new Error('ping failed'))
            }
        })

    }



}