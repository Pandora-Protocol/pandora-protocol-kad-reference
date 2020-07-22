const KBucket = require('./kbucket')
const BufferUtils = require('../helpers/buffer-utils')

module.exports = class KBucket extends Array {

    constructor( bucketIndex) {
        super();
        this.bucketIndex = bucketIndex;
    }

    get tail(){
        return this[this.length-1];
    }

    get head(){
        return this[0];
    }

    getBucketClosestToKey( key, count =  global.KAD_OPTIONS.BUCKET_COUNT_K ){

        const contacts = [], distances = {};

        for (let i=0; i < this.length; i++ ){
            contacts.push( this[i].contact )
            distances[this[i].contact.identityHex] = BufferUtils.xorDistance(this[i].contact.identity, key );
        }

        return contacts.sort((a,b)=> BufferUtils.compareKeyBuffers( distances[a.identityHex], distances[b.identityHex]) )
            .filter( a => !a.identity.equals(key) )
            .splice(0, count)

    }

    findContactByIdentity(identity){

        for (let i=0; i < this.length; i++)
            if (this[i].contact.identity.equals(identity) )
                return i

        return -1;
    }

}