const ECCUtils = require('./../../helpers/ecc-utils')
const bencode = require('bencode')
const CryptoUtils = require('./../../helpers/crypto-utils')

module.exports = function (options){

    return class MyContactStorage extends options.ContactStorage{

        async createContactArgs ( opts ){

            if (!opts.privateKey) {
                const keyPair = ECCUtils.createPair();
                opts.privateKey = keyPair.privateKey;
            }

            if (!opts.publicKey)
                opts.publicKey = ECCUtils.getPublicKey(opts.privateKey);


            if (!opts.timestamp)
                opts.timestamp = Math.floor(new Date().getTime() / 1000) - KAD_OPTIONS.PLUGINS.CONTACT_SPARTACUS.T_CONTACT_TIMESTAMP_DIFF_UPDATE;

            const out = await super.createContactArgs(opts);

            out.args.push(opts.nonce)
            out.args.push(opts.timestamp)

            const signature = ECCUtils.sign( opts.privateKey, CryptoUtils.sha256( bencode.encode( out.args ) ) );

            return {
                ...out,
                privateKey: opts.privateKey,
                args: [
                    ...out.args,
                    signature
                ]
            };

        }


    }


}

