const CryptoUtils = require('./../../helpers/crypto-utils')
const MarshalUtils = require('./../../helpers/marshal-utils')
const ECCUtils = require('./../../helpers/ecc-utils')

const bencode = require('bencode')

module.exports = function (options){

    return class MyContactStorage extends options.ContactStorage {

        constructor() {
            super(...arguments);

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