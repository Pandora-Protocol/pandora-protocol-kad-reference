const CryptoUtils = require('./../../helpers/crypto-utils')
const MarshalUtils = require('./../../helpers/marshal-utils')
const ECCUtils = require('./../../helpers/ecc-utils')

const bencode = require('bencode')

module.exports = function (options){

    return class MyContactStorage extends options.ContactStorage {

        constructor() {
            super(...arguments);

            options.PluginSybilProtectSign.initialize();
        }

        async sybilProtectSign( data, params = {}, initialIndex ){

            const finalOut = {};

            finalOut.index = initialIndex || Math.floor( Math.random() * KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS.length);

            const {privateKey, publicKey, uri} = KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[finalOut.index];

            let message = [
                data.message,
            ];

            if (privateKey) {

                if (params.includeTime) {
                    finalOut.time = Math.floor( new Date().getTime()/1000 );
                    message.push( MarshalUtils.marshalNumberFixed(finalOut.time, 7) );
                }

                message = Buffer.concat(message);
                if (message.length !== 32)
                    message = CryptoUtils.sha256(message);

                finalOut.signature = ECCUtils.sign(privateKey, message );


            }
            else {

                const out = await options.PluginSybilProtectSign.sign( uri,  data, params);

                if (typeof out.signature !== "string" || out.signature.length !== 128)
                    throw 'Signature has to be 64 bytes. Try again';

                finalOut.signature = Buffer.from(out.signature, 'hex');

                if (params.includeTime) {

                    if (typeof out.time !== "number" || !out.time)
                        throw "Invalid time";

                    finalOut.time = out.time;
                    message.push( MarshalUtils.marshalNumberFixed(finalOut.time, 7) );
                }

                message = Buffer.concat(message);
                if (message.length !== 32)
                    message = CryptoUtils.sha256(message);

            }

            if (!ECCUtils.verify(publicKey, message, finalOut.signature))
                throw 'Signature is incorrect';

            return finalOut
        }


        async createContactArgs ( opts ){

            if (!opts.privateKey) {
                const keyPair = ECCUtils.createPair();
                opts.privateKey = keyPair.privateKey;
            }

            if (!opts.publicKey)
                opts.publicKey = ECCUtils.getPublicKey(opts.privateKey);

            if (opts.setSybilProtect || opts.sybilProtectSignature){

                if (!opts.sybilProtectSignature) {
                    const out = await this.sybilProtectSign( {
                        message: CryptoUtils.sha256(opts.publicKey)
                    }, {}, undefined);
                    opts.sybilProtectSignature = out.signature;
                    opts.sybilProtectIndex = out.index+1;
                }

                opts.nonce = opts.sybilProtectSignature;

            } else {
                opts.nonce = Buffer.alloc(64);
                opts.sybilProtectIndex = 0;
            }

            opts.identity = CryptoUtils.sha256( Buffer.concat( [ opts.nonce, opts.publicKey ] ) );

            const out = await super.createContactArgs( opts );

            out.args.push(opts.sybilProtectIndex);

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
                    opts.sybilProtectIndex,
                ]
            };


        }

    }

}