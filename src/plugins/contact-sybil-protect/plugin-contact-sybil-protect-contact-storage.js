const CryptoUtils = require('./../../helpers/crypto-utils')
const ECCUtils = require('./../../helpers/ecc-utils')


module.exports = function (options){

    return class MyContactStorage extends options.ContactStorage {


        sybilSign( message, index, cb){

            if (index === undefined)
                index = Math.floor( Math.random() * KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS.length);

            const sybilSignature = ECCUtils.sign( KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[index].privateKey, CryptoUtils.sha256( message ) );

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

                if (!opts.privateKey) {
                    const keyPair = ECCUtils.createPair();
                    opts.privateKey = keyPair.privateKey;
                }

                if (!opts.publicKey)
                    opts.publicKey = ECCUtils.getPublicKey(opts.privateKey);

                this.sybilSign( opts.publicKey, undefined, async (err, sybilSignature )=>{

                    if (err) return reject(err);

                    opts.nonce = sybilSignature.signature;
                    opts.identity = CryptoUtils.sha256( Buffer.concat( [ opts.nonce, opts.publicKey ] ) );

                    let out;
                    try{
                        out = await super.createContactArgs( opts );
                    }catch(err){
                        return reject(err);
                    }
                    resolve(out);

                } );

            })


        }

    }

}