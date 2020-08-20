const CryptoUtils = require('./../../helpers/crypto-utils')
const ECCUtils = require('./../../helpers/ecc-utils')


module.exports = function (options){

    return class MyContactStorage extends options.ContactStorage {


        sybilSign( message, index, cb){

            if (index === undefined)
                index = Math.floor( Math.random() * KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS.length);

            const hash = CryptoUtils.sha256( message );
            const sybilSignature = ECCUtils.sign( hash, KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[index].privateKey );

            let hex = index.toString(16, 2);
            if (hex.length === 1) hex = "0"+hex;

            const signature = Buffer.concat([
                Buffer.from( hex, "hex"),
                sybilSignature,
            ]);

            cb(null, {
                index,
                signature,
            })
        }

        createContactArgs ( opts ){

            return new Promise((resolve, reject)=>{

                if (!opts.publicKey) {
                    const keyPair = ECCUtils.createPair();
                    opts.publicKey = keyPair.publicKey;
                    opts.privateKey = keyPair.privateKey;
                }

                this.sybilSign( opts.publicKey, undefined, async (err, sybilSignature )=>{

                    if (err) return cb(err);

                    opts.nonce = sybilSignature.signature;
                    opts.identity = CryptoUtils.sha256( Buffer.concat( [ opts.nonce, opts.publicKey ] ) );

                    try{
                        const out = await super.createContactArgs( opts );
                        resolve(out);
                    }catch(err){
                        reject(err);
                    }

                } );

            })


        }

    }

}