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

        this._methods = {};

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
                        if ( this._methods[method].findMerge(table, key, result[1], contact, method, finalOutputs) )
                            if (finishWhenValueFound)
                                finished = true;

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