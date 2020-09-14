const CryptoUtils = require('./../../helpers/crypto-utils')
const MarshalUtils = require('./../../helpers/marshal-utils')
const ECCUtils = require('./../../helpers/ecc-utils')
const bencode = require('bencode')

module.exports = function (options){

    return class MyContactStorage extends options.ContactStorage {

        constructor() {
            super(...arguments);

            options.PluginSybilSign.initialize();
        }

        async sybilSign( message, initialIndex, includeTime ){

            let sybilSignature, index, time;

            index = initialIndex || Math.floor( Math.random() * KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS.length);

            const {privateKey, publicKey, uri} = KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[index];

            if (privateKey) {
                sybilSignature = ECCUtils.sign(privateKey, CryptoUtils.sha256(message))
            }
            else {

                const finalUri = uri + '/challenge/'+message.toString('hex')+ (includeTime ? '/1' : '/0');
                console.info('Open', finalUri );

                const data = await options.PluginSybilSign.sign(uri, finalUri, publicKey, message);

                if (typeof data.signature !== "string" || data.signature.length !== 128)
                    throw 'Signature has to be 64 bytes. Try again';

                sybilSignature = Buffer.from(data.signature, 'hex');
                time = data.time;

                if (includeTime)
                    message = CryptoUtils.sha256( Buffer.concat( [
                        message,
                        MarshalUtils.marshalNumberFixed( time, 7),
                    ]) );

                if (!ECCUtils.verify(publicKey, message, sybilSignature))
                    throw 'Signature is incorrect';


            }

            return {
                index,
                sybilSignature,
                time,
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

                if (!opts.sybilSignature) {
                    const out = await this.sybilSign( CryptoUtils.sha256(opts.publicKey));
                    opts.sybilSignature = out.sybilSignature;
                    opts.sybilIndex = out.index+1;
                }

                opts.nonce = opts.sybilSignature;

            } else {
                opts.nonce = Buffer.alloc(64);
                opts.sybilIndex = 0;
            }

            opts.identity = CryptoUtils.sha256( Buffer.concat( [ opts.nonce, opts.publicKey ] ) );

            const out = await super.createContactArgs( opts );

            out.args.push(opts.sybilIndex);

            let index;
            for (let i=0; i < out.args.length; i++)
                if ( out.args[i] === opts.signature ){
                    index = i;
                    out.args.splice(i, 1);
                    break;
                }

            const signature = ECCUtils.sign( opts.privateKey, CryptoUtils.sha256( bencode.encode( out.args ) ) );
            out.args.splice( index, 0, signature);

            return {
                ...opts,
                args: [
                    ...out.args,
                    opts.sybilIndex,
                ]
            };


        }

    }

}