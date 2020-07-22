const BufferUtils = require('../helpers/buffer-utils')
const KBucket = require('./kbucket')
const async = require('async')
const RoutingTableRefresher = require('./routing-table-refresher')

module.exports = class RoutingTable {

    constructor(kademliaNode) {

        this._kademliaNode = kademliaNode;

        this.buckets = new Array(global.KAD_OPTIONS.BUCKETS_COUNT_B).fill( null );
        this.buckets = this.buckets.map( (it, index) =>  new KBucket(index) );
        this.map = {};

        this.refresher = new RoutingTableRefresher(kademliaNode, this);

        this.bucketsLookups = {}; // Track the last lookup time for buckets
        this.count = 0;
    }

    start(){
        this.refresher.start();
    }

    stop(){
        this.refresher.stop();
    }

    addContact(contact){

        if (contact.identity.equals( this._kademliaNode.contact.identity) )
            return [false];

        if (this.map[contact.identityHex]) {  //already have it
            this._refreshContactItem(this.map[contact.identityHex]);
            return [false, this.map[contact.identityHex].bucketIndex, -1, true];
        }

        const bucketIndex = this.getBucketIndex( contact.identity );

        if (this.buckets[bucketIndex].length === global.KAD_OPTIONS.BUCKET_COUNT_K)
            return [false, bucketIndex, -1, false]; //I have already too many in the bucket

        const newContact = {
            contact,
            bucketIndex: bucketIndex,
            pingLastCheck: Date.now(),
            pingResponded: null,
        }
        this.buckets[bucketIndex].push( newContact );
        this.map[contact.identityHex] = newContact;
        this.count += 1;

        return [true, bucketIndex, this.buckets, this.buckets[bucketIndex].length-1 ];
    }


    removeContact(contact){

        const item = this.map[contact.identityHex];
        if (!item) return;

        //new search, because the position could have been changed
        const index = this.buckets[item.bucketIndex].findContactByIdentity(item.contact.identity);

        if (index !== -1) {
            this.buckets[item.bucketIndex].splice(index, 1);
            delete this.map[item.contact.identityHex];
            this.count -= 1;
        }
    }


    _refreshContactItem(contactItem){
        contactItem.pingLastCheck = Date.now();
        this._sortBucket( contactItem.bucketIndex );
    }

    _sortBucket(bucketIndex){
        this.buckets[ bucketIndex ].sort( (a,b) => a.pingLastCheck - b.pingLastCheck  );
    }

    getBucketIndex(foreignNodeKey){

        const distance = BufferUtils.xorDistance(this._kademliaNode.contact.identity, foreignNodeKey );
        let bucketIndex = global.KAD_OPTIONS.BUCKETS_COUNT_B;

        for (const byteValue of distance) {
            if (byteValue === 0) {
                bucketIndex -= 8;
                continue;
            }

            for (let i = 0; i < 8; i++) {
                if (byteValue & (0x80 >> i))
                    return --bucketIndex;
                else
                    bucketIndex--;
            }
        }

        return bucketIndex;
    }



    getClosestToKey(key, count = global.KAD_OPTIONS.BUCKET_COUNT_K, bannedMap){

        const bucketIndex = this.getBucketIndex(key);
        const contactResults = [];

        const _addNearestFromBucket = bucket => {

            if (!this.buckets[bucket].length) return; //optimization, some buckets might be empty

            const entries = this.buckets[bucket].getBucketClosestToKey( key, count  );

            for (let i = 0; i < entries.length && contactResults.length < count; i++)
                if ( !bannedMap || !bannedMap[entries[i].identityHex] )
                    contactResults.push(entries[i]);

        }

        let ascIndex = bucketIndex+1;
        let descIndex = bucketIndex-1;

        _addNearestFromBucket(bucketIndex);

        while (contactResults.length < count && descIndex >= 0)
            _addNearestFromBucket(descIndex--);

        while (contactResults.length < count && ascIndex < global.KAD_OPTIONS.BUCKETS_COUNT_B)
            _addNearestFromBucket(ascIndex++);

        return contactResults;

    }



    /**
     * Returns the [index, bucket] of the occupied bucket with the lowest index
     * @returns {array}
     */
    getClosestBucket() {

        for (let i=0; i < this.buckets.length-1; i++ )
            if ( this.buckets[i].length !== 0)
                return this.buckets[i];

    }

    /**
     * Returns an array of all occupied buckets further than the closest
     * @returns {array}
     */
    getBucketsBeyondClosest() {
        const furtherBuckets = [];
        const closestBucket = this.getClosestBucket();

        if (closestBucket)
            for (let i = closestBucket.bucketIndex + 1; i < this.buckets.length; i++)
                if (this.buckets[i].length !== 0)
                    furtherBuckets.push( this.buckets[i] );

        return furtherBuckets;
    }

}