const CryptoUtils = require('../../../helpers/crypto-utils')
const MarshalUtils = require('../../../helpers/marshal-utils')
const ECCUtils = require('../../../helpers/ecc-utils')

module.exports = function (options) {

    return class MySybilProtectSignBase extends (options.SybilProtectSignBase || Object){

        async sybilProtectSign( data, params = {}, initialIndex ){

            const finalOut = {};
            let privateKey, publicKey, uri;

            let trials = 0;
            while (trials < 10){
                finalOut.index = initialIndex || Math.floor( Math.random() * KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS.length);
                const it = KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[finalOut.index];
                publicKey = it.publicKey;

                if (publicKey) {
                    uri = it.uri;
                    privateKey = it.privateKey;
                    break;
                } else {
                    trials++;
                }

            }

            let message = [
                data.message,
            ];

            if (privateKey) {

                if (params.includeTime) {
                    finalOut.time = Math.floor( new Date().getTime()/1000 );
                    message.push( MarshalUtils.marshalNumberBufferFast(finalOut.time) );
                }

                message = Buffer.concat(message);
                if (message.length !== 32)
                    message = CryptoUtils.sha256(message);

                finalOut.signature = ECCUtils.sign(privateKey, message );


            }
            else {

                const out = await options.sybilProtectSign.sign( uri,  data, params);

                if (typeof out.signature !== "string" || out.signature.length !== 128)
                    throw 'Signature has to be 64 bytes. Try again';

                finalOut.signature = Buffer.from(out.signature, 'hex');

                if (params.includeTime) {

                    if (typeof out.time !== "number" || !out.time)
                        throw "Invalid time";

                    finalOut.time = out.time;
                    message.push( MarshalUtils.marshalNumberBufferFast(finalOut.time) );
                }

                message = Buffer.concat(message);
                if (message.length !== 32)
                    message = CryptoUtils.sha256(message);

            }

            if (!ECCUtils.verify(publicKey, message, finalOut.signature))
                throw 'Signature is incorrect';

            return finalOut
        }

    }

}