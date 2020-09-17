const async = require('async');
const Validation = require('../helpers/validation')
const ContactList = require('./contact-list')
const Contact = require('./../contact/contact')
const {default: PQueue} = require('p-queue');

module.exports = class Crawler {

    constructor(kademliaNode) {
        this._kademliaNode = kademliaNode;

        this._updateContactQueue = new PQueue({concurrency: KAD_OPTIONS.ALPHA_CONCURRENCY});
        this._storeMissingKeysQueue = new PQueue({concurrency: KAD_OPTIONS.ALPHA_CONCURRENCY});

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
    async iterativeFindNode(key ){

        Validation.validateIdentity(key);
        return this._iterativeFind('', 'FIND_NODE', 'STORE', key, false);

    }

    async iterativeFindValue(table, masterKey){

        const allowedTable = this._kademliaNode.rules._allowedStoreTables[table.toString()];
        if (!allowedTable) throw 'Table is not allowed';

        if (typeof table === 'string') table = Buffer.from(table);
        if (typeof masterKey === 'string') masterKey = Buffer.from(masterKey);

        Validation.validateIdentity(masterKey);
        Validation.validateTable(table);

        const finishWhenValueFound = allowedTable.immutable && allowedTable.onlyOne;

        if (finishWhenValueFound){

            const out = await this._kademliaNode._store.get(table.toString(), masterKey.toString('hex') );
            if (out){
                for (const key in out)
                    out[key] = {
                        value: out[key],
                        contact: this._kademliaNode.contact
                    }
                return {result: out};
            }

        }

        return this._iterativeFind( table,'FIND_VALUE', 'STORE', masterKey, finishWhenValueFound);

    }

    _iterativeFindMerge(table, masterKey, result, contact, finishWhenValueFound, method, finalOutputs){

        const allowedTable = this._kademliaNode.rules._allowedStoreTables[table.toString()];

        for (const key in result)
            if ( (!finalOutputs[key] && !finishWhenValueFound) || finishWhenValueFound ) {

                const data = allowedTable.validation(contact, allowedTable, [table, masterKey, Buffer.from(key, 'hex'), result[key]], finalOutputs[key]);
                if (data)
                    finalOutputs[key] = {
                        value: data,
                        contact,
                    }
            }

    }

    async _iterativeFind( table, method, methodStore, key, finishWhenValueFound ){

        const data = ( method === 'FIND_NODE' ) ? [key] : [table, key];

        this._kademliaNode.routingTable.bucketsLookups[ this._kademliaNode.routingTable.getBucketIndex( key ) ] = new Date().getTime();

        const shortlist = new ContactList( key, this._kademliaNode.routingTable.getClosestToKey(key, KAD_OPTIONS.ALPHA_CONCURRENCY ) );
        let closest = shortlist.closest;

        let finished, finishedSilent = false;
        const finalOutputs = {};

        const dispatchFindNode = async (contact) => {

            //mark this node as contacted so as to avoid repeats
            shortlist.contacted(contact);

            try{

                const result = await this._kademliaNode.rules.send(contact, method, data);

                // mark this node as active to include it in any return values
                shortlist.responded(contact);

                if (!result || (Array.isArray(result) && !result.length))
                    return null;

                //If the result is a contact/node list, just keep track of it
                if ( result[0] === 0 ){

                    const added = shortlist.add( result[1] );

                    //If it wasn't in the shortlist, we haven't added to the routing table, so do that now.
                    added.map( contact => this._updateContactFound(contact) );

                } else if ( result[0] === 1 && method !== 'FIND_NODE' ){

                    //If we did get an item back, get the closest node we contacted
                    //who is missing the value and store a copy with them
                    const closestMissingValue = shortlist.active[0];

                    if (closestMissingValue) {

                        const elements = Array.isArray(result[1]) ? result[1] : [ result[1] ];
                        elements.map( data => this._sendStoreMissingKey(table, closestMissingValue, methodStore, key, data ) );

                    }

                    //  we found a value, so stop searching
                    if (!finished) {

                        finishedSilent = true;

                        //let's validate the data
                        if (finishWhenValueFound)
                            finished = true;

                        this._iterativeFindMerge(table, key, result[1], contact, finishWhenValueFound, method, finalOutputs);

                    }

                }

            }catch(err){
                return null;
            }

        }

        const iterativeLookup =  async (selection, continueLookup = true) => {

            //nothing new to do
            if ( !selection.length )
                return shortlist.active.slice(0, KAD_OPTIONS.BUCKET_COUNT_K);

            const results = await Promise.all(selection.map( contact => dispatchFindNode( contact )));

            if ( finishedSilent )
                return {result: finalOutputs };

            // If we have reached at least K active nodes, or haven't found a
            // closer node, even on our finishing trip, return to the caller
            // the K closest active nodes.
            if (shortlist.active.length >= KAD_OPTIONS.BUCKET_COUNT_K || (closest === shortlist.closest && !continueLookup) )
                return shortlist.active.slice(0, KAD_OPTIONS.BUCKET_COUNT_K);

            // NB: we haven't discovered a closer node, call k uncalled nodes and
            // NB: finish up
            if (closest === shortlist.closest || closest.identity.equals(shortlist.closest.identity) )
                return iterativeLookup( shortlist.uncontacted.slice(0, KAD_OPTIONS.BUCKET_COUNT_K), false );

            closest = shortlist.closest;

            //continue the lookup with ALPHA close, uncontacted nodes
            return iterativeLookup( shortlist.uncontacted.slice(0, KAD_OPTIONS.ALPHA_CONCURRENCY), true );

        }

        return iterativeLookup( shortlist.uncontacted.slice(0, KAD_OPTIONS.ALPHA_CONCURRENCY), true);

    }

    async _iterativeStoreValue( data, method, storeCb){

        const key = data[1];

        let stored = 0;
        const dispatchSendStore = async (contact) =>{
            try{
                const out = await this._kademliaNode.rules[method]( contact, data);
                if (out) stored += 1;
            }catch(err){

            }
        }

        const contacts = await this.iterativeFindNode( key );
        await Promise.mapLimit( contacts.map( contact => dispatchSendStore.bind( this, contact) ), KAD_OPTIONS.ALPHA_CONCURRENCY);
        await storeCb(data);

        if (!stored) throw "Failed to store key";
        this._kademliaNode.routingTable.refresher.publishedByMe[key] = true;

        return stored;
    }

    iterativeStoreValue(table, masterKey, key, value){

        if (typeof table === 'string') table = Buffer.from(table);
        if (typeof masterKey === 'string') masterKey = Buffer.from(masterKey);
        if (typeof key === 'string') key = Buffer.from(key);
        if (typeof value === 'string') value = Buffer.from(value);

        const allowedTable = this._kademliaNode.rules._allowedStoreTables[table.toString()];
        if (!allowedTable) throw 'Table is not allowed';

        return this._iterativeStoreValue(  [table, masterKey, key, value], 'sendStore', data => this._kademliaNode._store.put( table.toString(), masterKey.toString('hex'), key.toString('hex'), value, allowedTable.expiry ),)
    }

    _updateContactFound(contact){
        this._updateContactQueue.add(  () => this._updateContactWorker(contact) );
    }

    async _updateContactWorker(contact){

        try{

            if (contact.identity.equals( this._kademliaNode.contact.identity) )
                return null;

            const [result, bucketIndex, refreshed ] = this._kademliaNode.routingTable.addContact(contact);
            if (result || refreshed || (!result && !refreshed))
                return true;

            const tail = this._kademliaNode.routingTable.buckets[bucketIndex].tail;
            if (tail.pingResponded && tail.pingLastCheck > ( new Date().getTime() - 600000 ) )
                throw "Bucket is full";

            const out = await this._kademliaNode.rules.sendPing(tail.contact);
            tail.pingLastCheck = new Date().getTime();

            if (out){
                tail.pingResponded = true;
            } else {
                this._kademliaNode.routingTable.removeContact(tail.contact);
                this._kademliaNode.routingTable.addContact(contact);
            }

        }catch(err){

        }

    }


    _sendStoreMissingKey( table, closestMissingValue, methodStore, key, data ){

        if (Array.isArray(data)) data = [table, key, ...data]
        else data = [table,  key, data];

        this._storeMissingKeysQueue.add( () => {
            this._kademliaNode.rules.send( closestMissingValue, methodStore, data);
        } );
    }

}