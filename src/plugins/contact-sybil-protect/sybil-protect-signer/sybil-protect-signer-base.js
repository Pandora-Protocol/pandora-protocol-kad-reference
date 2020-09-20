const CryptoUtils = require('../../../helpers/crypto-utils')
const MarshalUtils = require('../../../helpers/marshal-utils')
const ECCUtils = require('../../../helpers/ecc-utils')

module.exports = function (options) {

    return class MySybilProtectSignerBase extends (options.SybilProtectSignerBase || Object){

        getRandomSybilIndex(){

            let trials = 0;
            while (trials < 10){

                const index = Math.floor( Math.random() * KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS.length);

                if (KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[index].publicKey)
                    return index;

                trials++;

            }

            throw "Sybil Index couldn't be set"

        }

        async sign( data, params = {}, initialIndex ){

            const finalOut = {};
            finalOut.index = initialIndex || this.getRandomSybilIndex()

            const {privateKey, publicKey, origin, uri} = KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[finalOut.index];

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

                const out = await this.signNow( origin, uri,  data, params);

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


        validateSignature (sybilProtectIndex = 0, sybilProtectAdditional, signature, message) {

            if (sybilProtectIndex !== 0){

                if ( sybilProtectIndex > KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS.length) throw "Nonce invalid sybil public key index";
                const sybilPublicKey = KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[ sybilProtectIndex-1 ].publicKey;

                if (sybilProtectAdditional.length){

                    const args = [ message ];

                    for (const arg of sybilProtectAdditional)
                        if (arg === undefined) continue;
                        else if (typeof arg === "number")
                            args.push(MarshalUtils.marshalNumberBufferFast(arg));
                        else throw "invalid arg"

                    message = CryptoUtils.sha256( Buffer.concat( args ));
                }

                if ( !ECCUtils.verify( sybilPublicKey, message, signature ))
                    throw "Nonce is invalid";

            } else {
                if (!signature.equals(KAD_OPTIONS.SIGNATURE_EMPTY)) throw "Nonce needs to be empty"
                for (const arg of sybilProtectAdditional)
                    if (arg === undefined) continue;
                    else if (typeof arg === "number" && arg === 0) continue;
                    else throw "Invalid arg";
            }

        }

    }

}