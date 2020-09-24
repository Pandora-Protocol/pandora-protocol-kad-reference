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
                    message.push( MarshalUtils.marshalNumberFixed(finalOut.time) );
                }
                if (params.includeVotes){

                    if (typeof params.oldVotes.votesCount !== "number") throw "votes count is invalid";
                    if (typeof params.oldVotes.votesDown !== "number") throw "votes down is invalid";

                    const oldMessage = [
                        data.message,
                        MarshalUtils.marshalNumberFixed(params.oldVotes.time),
                        MarshalUtils.marshalNumberFixed(params.oldVotes.votesCount),
                        MarshalUtils.marshalNumberFixed(params.oldVotes.votesDown),
                    ]

                    const signature = Buffer.from(params.oldVotes.signature, 'hex');
                    const verify = ECCUtils.verify( publicKey, Buffer.concat(oldMessage), signature);
                    if (!verify) throw "Signature is invalid";

                    const votesCount = params.oldVotes.votesCount + 1;
                    const votesDown  = params.oldVotes.votesDown + ( params.vote ? 0 : 1 );

                    message.push( MarshalUtils.marshalNumberFixed( votesCount ) );
                    message.push( MarshalUtils.marshalNumberFixed( votesDown ) );
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
                    message.push( MarshalUtils.marshalNumberFixed(finalOut.time) );
                }
                if (params.includeVotes){

                    finalOut.votesCount = out.votesCount;
                    finalOut.votesDown = out.votesDown;

                    if (finalOut.votesCount !== params.oldVotes.votesCount + 1 ) throw "Final VotesCount is invalid";
                    if (finalOut.votesDown !== params.oldVotes.votesDown + (params.vote ? 0 : 1) ) throw "Final VotesDown is invalid";

                    message.push( MarshalUtils.marshalNumberFixed( finalOut.votesCount ) );
                    message.push( MarshalUtils.marshalNumberFixed( finalOut.votesDown ) );

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
                            args.push(MarshalUtils.marshalNumberFixed(arg));
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