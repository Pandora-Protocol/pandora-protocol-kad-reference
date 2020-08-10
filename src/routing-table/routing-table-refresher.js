const BufferUtils = require('../helpers/buffer-utils')
const async = require('async')
const NextTick = require('./../helpers/next-tick')
const {setAsyncInterval, clearAsyncInterval} = require('./../helpers/async-interval')
const Utils = require('./../helpers/utils')
module.exports = class RoutingTableRefresher {

    constructor(kademliaNode, routingTable) {
        this._kademliaNode = kademliaNode;
        this._routingTable = routingTable;

        this._publishedByMe = {};

    }

    publishedByMe(key){
        this._publishedByMe[key] = true;
    }


    async start(opts, cb){

        if (this._started) throw "Refresher already started";

        this._intervalRefresh = setAsyncInterval(
            next => this.refresh(0, next ),
            KAD_OPTIONS.T_BUCKETS_REFRESH + Utils.preventConvoy(30 * 60 * 1000),
        )

        this._intervalReplicate = setAsyncInterval(
            next => this._replicate(undefined, next),
            KAD_OPTIONS.T_BUCKETS_REFRESH + Utils.preventConvoy(30 * 60 * 1000),
        )

        this._started = true;

        return { refresher: true };
    }

    stop(){
        if (!this._started) throw "Refresher wasn't started";

        clearAsyncInterval(this._intervalRefresh);
        clearAsyncInterval(this._intervalReplicate);

        this._started = false;
    }


    /**
     * If no node lookups have been performed in any given bucket's range for
     * T_REFRESH, the node selects a random number in that range and does a
     * refresh, an iterativeFindNode using that number as key.
     * @param {number} startIndex
     */
    refresh(startIndex = 0, cb) {
        const now = new Date().getTime();

        /**
         *  We want to avoid high churn during refresh and prevent further
         *  refreshes if lookups in the next bucket do not return any new
         *  contacts. To do this we will shuffle the bucket indexes we are
         *  going to check and only continue to refresh if new contacts were
         *  discovered in the last MAX_UNIMPROVED_REFRESHES consecutive lookups.
         * @type {Set<any>}
         */

        let results = new Set(), consecutiveUnimprovedLookups = 0, finished = false;
        async.each(  this._routingTable.buckets, (bucket, next) => {

            if ( bucket.bucketIndex < startIndex || finished) return next();

            if (consecutiveUnimprovedLookups >= KAD_OPTIONS.MAX_UNIMPROVED_REFRESHES){
                finished = true;
                return next();
            }

            const lastBucketLookup = this._routingTable.bucketsLookups[bucket.bucketIndex] || 0;
            const needsRefresh = lastBucketLookup + KAD_OPTIONS.T_BUCKETS_REFRESH <= now;

            if (bucket.array.length > 0 && needsRefresh){

                this._kademliaNode.crawler.iterativeFindNode(
                    BufferUtils.getRandomBufferInBucketRange(this._kademliaNode.contact.identity, bucket.bucketIndex),
                    (err, contacts )=>{

                        if (err) return next();

                        let discoveredNewContacts = false;

                        for (let contact of contacts)
                            if (!results.has(contact.identityHex)) {
                                discoveredNewContacts = true;
                                consecutiveUnimprovedLookups = 0;
                                results.add(contact.identityHex);
                            }

                        if (!discoveredNewContacts)
                            consecutiveUnimprovedLookups++;

                        next();
                    },
                );

            } else
                next();

        }, (err, out ) => {
            cb(err, out);
        });
    }


    _replicate(iterator, next){

        const now = new Date().getTime();
        if ( !iterator  )
            iterator = this._kademliaNode._store.iterator();

        let itValue = iterator.next();
        while (itValue.value && !itValue.done){

            const key = itValue.value[0];
            const value = itValue.value[1];

            const isPublisher = this._publishedByMe[key];
            const republishDue = (value.timestamp + KAD_OPTIONS.T_BUCKETS_REPUBLISH) <= now;
            const replicateDue = (value.timestamp + KAD_OPTIONS.T_BUCKETS_REPLICATE) <= now;
            const shouldRepublish = isPublisher && republishDue;
            const shouldReplicate = !isPublisher && replicateDue;

            if (shouldReplicate || shouldRepublish) 
                return this._kademliaNode.crawler.iterativeStoreValue(key, value, (err, out) => {
                    NextTick(this._replicate.bind(this, iterator, next), 1);
                });

        }

        if (!itValue.value || !itValue.done)
            next();


    }

}