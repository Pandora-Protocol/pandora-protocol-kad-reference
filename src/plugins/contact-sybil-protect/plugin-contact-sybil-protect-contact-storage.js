const CryptoUtils = require('./../../helpers/crypto-utils')
const ECCUtils = require('./../../helpers/ecc-utils')


module.exports = function (options){

    return class MyContactStorage extends options.ContactStorage {


        async sybilSign( message, index){

            if (index === undefined)
                index = Math.floor( Math.random() * KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS.length);

            const sybilSignature = ECCUtils.sign( KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[index].privateKey, CryptoUtils.sha256( message ) );

            let hex = (index+1).toString(16, 2);
            if (hex.length === 1) hex = "0"+hex;

            const signature = Buffer.concat([
                Buffer.from( hex, "hex"),
                sybilSignature,
            ]);

            return {
                index,
                signature,
            }
        }

        async createContactArgs ( opts ){

            if (!opts.privateKey) {
                const keyPair = ECCUtils.createPair();
                opts.privateKey = keyPair.privateKey;
            }

            if (!opts.publicKey)
                opts.publicKey = ECCUtils.getPublicKey(opts.privateKey);

            if (! opts.sybilSignature ) {
                const out = await this.sybilSign(opts.publicKey, undefined);
                opts.sybilSignature = out.signature;
            }

            opts.nonce = opts.sybilSignature;
            opts.identity = CryptoUtils.sha256( Buffer.concat( [ opts.nonce, opts.publicKey ] ) );

            return {
                ...opts,
                ...( await super.createContactArgs( opts ) ),
            };


        }

    }

}