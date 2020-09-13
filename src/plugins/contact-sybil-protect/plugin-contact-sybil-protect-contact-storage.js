const CryptoUtils = require('./../../helpers/crypto-utils')
const ECCUtils = require('./../../helpers/ecc-utils')

module.exports = function (options){

    return class MyContactStorage extends options.ContactStorage {

        constructor() {
            super(...arguments);

            options.PluginSybilSign.initialize();
        }

        async sybilSign( message, initialIndex){

            let sybilSignature, index;

            index = initialIndex || Math.floor( Math.random() * KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS.length);

            const {privateKey, publicKey, uri} = KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[index];

            if (privateKey) {
                sybilSignature = ECCUtils.sign(privateKey, CryptoUtils.sha256(message))
            }
            else {

                const finalUri = uri + '/challenge/'+message.toString('hex')+'/1';
                console.info('Open', finalUri );

                const data = await options.PluginSybilSign.sign(uri, finalUri, publicKey, message);

                if (typeof data.signature !== "string" || data.signature.length !== 128)
                    throw 'Signature has to be 64 bytes. Try again';

                sybilSignature = Buffer.from(data.signature, 'hex');

                if (!ECCUtils.verify(publicKey, CryptoUtils.sha256(message), sybilSignature))
                    throw 'Signature is incorrect';

            }


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

            if (opts.setSybilProtect || opts.sybilSignature){

                if (! opts.sybilSignature ) {
                    const out = await this.sybilSign(opts.publicKey, undefined);
                    opts.sybilSignature = out.signature;
                }

                opts.nonce = opts.sybilSignature;

            } else {
                opts.nonce = Buffer.alloc(65);
            }

            opts.identity = CryptoUtils.sha256( Buffer.concat( [ opts.nonce, opts.publicKey ] ) );

            return {
                ...opts,
                ...( await super.createContactArgs( opts ) ),
            };


        }

    }

}