const Validation = require('./validation')
const { randomBytes } = require('crypto');
const bencode = require('bencode');

function getPowerOfTwoBufferForIndex(referenceKey, exp) {
    if (exp < 0 || exp >= global.KAD_OPTIONS.BUCKETS_COUNT_B) throw 'Index out of range';

    const buffer = Buffer.isBuffer(referenceKey)
        ? Buffer.from(referenceKey)
        : Buffer.from(referenceKey, 'hex');
    const byteValue = parseInt(exp / 8);

    // NB: We set the byte containing the bit to the right left shifted amount
    buffer[ global.KAD_OPTIONS.BUCKET_COUNT_K - byteValue - 1] = 1 << (exp % 8);

    return buffer;
}

module.exports = {

    /**
     * Returns the position where a xor b doesn't match
     * @param a
     * @param b
     */
    xorDistance(a, b){

        Validation.validateIdentity(a);
        Validation.validateIdentity(b);

        const length = Math.max(a.length, b.length);
        const buffer = Buffer.alloc(length);

        for (let i=0; i < length; i++)
            buffer[i] = a[i] ^ b[i];

        return buffer;
    },

    compareKeyBuffers (b1, b2) {

        Validation.validateIdentity(b1);
        Validation.validateIdentity(b2);

        for (let index = 0; index < b1.length; index++) {
            const bits = b1[index];

            if (bits !== b2[index]) {
                return bits < b2[index] ? -1 : 1;
            }
        }

        return 0;
    },

    getRandomBufferInBucketRange (referenceKey, index) {
        let base = getPowerOfTwoBufferForIndex(referenceKey, index);
        let byte = parseInt(index / 8); // NB: Randomize bytes below the power of two

        for (let i = global.KAD_OPTIONS.BUCKET_COUNT_K - 1; i > (global.KAD_OPTIONS.BUCKET_COUNT_K - byte - 1); i--)
            base[i] = parseInt(Math.random() * 256);


        // NB: Also randomize the bits below the number in that byte and remember
        // NB: arrays are off by 1
        for (let j = index - 1; j >= byte * 8; j--) {
            let one = Math.random() >= 0.5;
            let shiftAmount = j - byte * 8;

            base[ global.KAD_OPTIONS.BUCKET_COUNT_K - byte - 1] |= one ? (1 << shiftAmount) : 0;
        }

        return base;
    },

    genBuffer(len) {
        return  randomBytes(len);
    },

    serializeData(data) {

        if (typeof data === "object" && data.toArray)
            data = data.toArray();
        else if (!Buffer.isBuffer(data) && typeof data === "object") {
            for (const key in data)
                data[key] = this.serializeData(data[key] );
        }

        return data;
    }


}