const CryptoUtils = require('./../../helpers/crypto-utils')
const ECCUtils = require('./../../helpers/ecc-utils')
const bencode = require('bencode')

module.exports = function (contactStorage){

    const _createContactArgs = contactStorage.createContactArgs;
    contactStorage.createContactArgs = createContactArgs;

    function createContactArgs ( privateKey, publicKey, nonce, protocol, address = '127.0.0.1', port = 8000){

        const identity = CryptoUtils.sha256( Buffer.concat( [ nonce, publicKey ] ) );

        const out = [
            ..._createContactArgs( publicKey, nonce, identity, protocol, address, port),
            Math.floor(new Date().getTime() / 1000),
        ]

        const signature = ECCUtils.sign( privateKey, CryptoUtils.sha256( bencode.encode( out ) ) );

        return [
            ...out,
            signature, //empty signature
        ];
    }


}

