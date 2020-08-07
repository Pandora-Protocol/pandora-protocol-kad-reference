const ECCUtils = require('./../../helpers/ecc-utils')
const bencode = require('bencode')
const CryptoUtils = require('./../../helpers/crypto-utils')

module.exports = function (contactStorage){

    const _createContactArgs = contactStorage.createContactArgs;
    contactStorage.createContactArgs = createContactArgs;

    function createContactArgs ( opts, cb){

        if (!opts.publicKey) {
            const keyPair = ECCUtils.createPair();
            opts.publicKey = keyPair.publicKey;
            opts.privateKey = keyPair.privateKey;
        }

        if (!opts.timestamp)
            opts.timestamp = Math.floor(new Date().getTime() / 1000);

        _createContactArgs(opts, (err, out )=>{

            out.args.push(opts.nonce)
            out.args.push(opts.timestamp)

            const signature = ECCUtils.sign( opts.privateKey, CryptoUtils.sha256( bencode.encode( out.args ) ) );

            cb(null, {
                ...out,
                args: [
                    ...out.args,
                    signature
                ]
            });

        })

    }

}

