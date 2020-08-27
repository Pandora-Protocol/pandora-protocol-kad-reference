const async = require('async');
const Validation = require('../helpers/validation')
const ContactList = require('./contact-list')
const Contact = require('./../contact/contact')

module.exports = class Crawler {

    constructor(kademliaNode) {
        this._kademliaNode = kademliaNode;

        this._updateContactQueue = async.queue(
            (task, cb) => this._updateContactWorker(task, cb),
            KAD_OPTIONS.ALPHA_CONCURRENCY,
        );

        this._storeMissingKeysQueue = async.queue(
            (task, cb) => this._sendStoreMissingKeyWorker(task, cb),
            KAD_OPTIONS.ALPHA_CONCURRENCY,
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

        this._iterativeFind('', 'FIND_NODE', 'STORE', key, false, cb);

    }

    iterativeFindValue(table, key, finishWhenValue = true, cb){

        const err1 = Validation.checkIdentity(key);
        const err2 = Validation.checkTable(table);
        if (err1 || err2) return cb(err1||err2);

        if (finishWhenValue){

            this._kademliaNode._store.get(table.toString('hex'), key.toString('hex'), (err, out)=>{

                if (out){
                    const obj = {  value: out, contact: this._kademliaNode.contact };
                    return cb(null, obj ? {result: obj} : undefined );
                }
                this._iterativeFind( table,'FIND_VALUE', 'STORE', key, finishWhenValue, cb);

            });

        } else
            this._iterativeFind( table,'FIND_VALUE', 'STORE', key, finishWhenValue, cb);

    }

    _iterativeFindMerge(table, key, result, contact, finishWhenValue, method, finalOutputs){

        const fct = this._kademliaNode.rules._allowedStoreTables[table.toString('ascii')];

        if ( fct(contact, [table, key, result ]) ) {
            finalOutputs.value = result;
            finalOutputs.contact = contact;
        }

    }

    _iterativeFind( table, method, methodStore, key, finishWhenValue, cb){

        const data = ( method === 'FIND_NODE' ) ? [key] : [table, key];

        this._kademliaNode.routingTable.bucketsLookups[ this._kademliaNode.routingTable.getBucketIndex( key ) ] = new Date().getTime();

        const shortlist = new ContactList( key, this._kademliaNode.routingTable.getClosestToKey(key, KAD_OPTIONS.ALPHA_CONCURRENCY ) );
        let closest = shortlist.closest;

        let finished, finishedSilent = false;
        const finalOutputs = {};

        function dispatchFindNode(contact, next){

            //mark this node as contacted so as to avoid repeats
            shortlist.contacted(contact);

            this._kademliaNode.rules.send(contact, method, data , (err, result) => {

                if ( err )
                    return next();

                try{

                    // mark this node as active to include it in any return values
                    shortlist.responded(contact);

                    if (!result || (Array.isArray(result) && !result.length)) {

                    } else
                    //If the result is a contact/node list, just keep track of it
                    if ( result[0] === 0 ){
                        const added = shortlist.add( result[1] );

                        //If it wasn't in the shortlist, we haven't added to the routing table, so do that now.
                        async.eachLimit(added, KAD_OPTIONS.ALPHA_CONCURRENCY,
                            ( contact, next ) => this._updateContactFound(contact, () => next() ),
                            () => {}
                        );

                    } else if ( result[0] === 1 && method !== 'FIND_NODE' ){

                        //If we did get an item back, get the closest node we contacted
                        //who is missing the value and store a copy with them
                        const closestMissingValue = shortlist.active[0];

                        if (closestMissingValue) {

                            const elements = Array.isArray(result[1]) ? result[1] : [ result[1] ];
                            async.eachLimit(elements, KAD_OPTIONS.ALPHA_CONCURRENCY,
                                (key, next) => this._sendStoreMissingKey(table, closestMissingValue, methodStore, key, data, () => next() ),
                                ()=> {}
                            );

                        }

                        //  we found a value, so stop searching
                        if (!finished) {

                            finishedSilent = true;

                            //let's validate the data
                            if (finishWhenValue)
                                finished = true;

                            this._iterativeFindMerge(table, key, result[1], contact, finishWhenValue, method, finalOutputs);


                        }

                    }

                }finally{
                    next();
                }

            })
        }

        function iterativeLookup(selection, continueLookup = true) {


            //nothing new to do
            if ( !selection.length )
                return cb(null, shortlist.active.slice(0, KAD_OPTIONS.BUCKET_COUNT_K) );

            async.each( selection, (contact, next) => dispatchFindNode.call(this, contact, next),
                (err, results)=>{

                    if ( finishedSilent )
                        return cb(null, {result: finalOutputs } );

                    if (err) return cb(err);

                    // If we have reached at least K active nodes, or haven't found a
                    // closer node, even on our finishing trip, return to the caller
                    // the K closest active nodes.
                    if (shortlist.active.length >= KAD_OPTIONS.BUCKET_COUNT_K || (closest === shortlist.closest && !continueLookup) )
                        return cb(null, shortlist.active.slice(0, KAD_OPTIONS.BUCKET_COUNT_K) );

                    // NB: we haven't discovered a closer node, call k uncalled nodes and
                    // NB: finish up
                    if (closest === shortlist.closest || closest.identity.equals(shortlist.closest.identity) )
                        return iterativeLookup.call(this, shortlist.uncontacted.slice(0, KAD_OPTIONS.BUCKET_COUNT_K), false );

                    closest = shortlist.closest;

                    //continue the lookup with ALPHA close, uncontacted nodes
                    iterativeLookup.call(this, shortlist.uncontacted.slice(0, KAD_OPTIONS.ALPHA_CONCURRENCY), true );
                })

        }

        iterativeLookup.call(this, shortlist.uncontacted.slice(0, KAD_OPTIONS.ALPHA_CONCURRENCY), true);

    }

    _iterativeStoreValue( data, method, storeCb, cb){

        const key = data[1];

        let stored = 0, self = this;
        function dispatchSendStore(contacts, done){
            async.eachLimit( contacts, KAD_OPTIONS.ALPHA_CONCURRENCY,
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
        return this._iterativeStoreValue(  [table, key, value], 'sendStore', (data, next) => this._kademliaNode._store.put( table.toString('hex'), key.toString('hex'), value, next ), cb)
    }

    _updateContactFound(contact, cb){

        this._updateContactQueue.push( contact, (err, tail )=> {

            if (err) return cb(err);

            if (tail && typeof tail === "object"){
                this._kademliaNode.routingTable.removeContact(tail.contact);
                this._kademliaNode.routingTable.addContact(contact);

            }

            cb(null, contact);

        })
    }

    _updateContactWorker(contact, cb){

        if (contact.identity.equals( this._kademliaNode.contact.identity) )
            return cb(null, null);

        const [result, bucketIndex, refreshed ] = this._kademliaNode.routingTable.addContact(contact);
        if (result || refreshed || (!result && !refreshed))
            return cb(null, true);

        const tail = this._kademliaNode.routingTable.buckets[bucketIndex].tail;
        if (tail.pingResponded && tail.pingLastCheck > ( new Date().getTime() - 600000 ) )
            return cb( new Error("bucket full"),)

        this._kademliaNode.rules.sendPing(tail.contact, (err, out)=>{
            tail.pingLastCheck = new Date().getTime();
            if (out){
                tail.pingResponded = true;
                cb(null, tail );
            }else {
                cb( new Error('ping failed'))
            }
        })

    }


    _sendStoreMissingKey( table, closestMissingValue, methodStore, key, data, cb ){

        let out;
        if (Array.isArray(data)) out = [table, key, ...data]
        else out = [table,  key, data];

        this._storeMissingKeysQueue.push({closestMissingValue, methodStore, out}, cb);
    }

    _sendStoreMissingKeyWorker( {closestMissingValue, methodStore, out}, cb){
        this._kademliaNode.rules.send( closestMissingValue, methodStore, out, cb);
    }

}