const BufferUtils = require('../helpers/buffer-utils')

//KBucket can't extend Array as we have an issue with Vue2
module.exports = class KBucket {

    constructor( bucketIndex) {
        this.bucketIndex = bucketIndex;
        this.array = [];
    }

    get tail(){
        return this.array[this.array.length-1];
    }

    get head(){
        return this.array[0];
    }

    getBucketClosestToKey( key, count =  global.KAD_OPTIONS.BUCKET_COUNT_K ){

        const contacts = [], distances = {};

        for (let i=0; i < this.array.length; i++ ){
            contacts.push( this.array[i].contact )
            distances[this.array[i].contact.identityHex] = BufferUtils.xorDistance(this.array[i].contact.identity, key );
        }

        return contacts.sort((a,b)=> BufferUtils.compareKeyBuffers( distances[a.identityHex], distances[b.identityHex]) )
            .filter( a => !a.identity.equals(key) )
            .splice(0, count)

    }

    findContactByIdentity(identity){

        for (let i=0; i < this.array.length; i++)
            if (this.array[i].contact.identity.equals(identity) )
                return i

        return -1;
    }

}