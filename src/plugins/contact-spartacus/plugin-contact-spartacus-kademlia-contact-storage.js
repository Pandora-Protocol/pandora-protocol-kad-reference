const CryptoUtils = require('./../../helpers/crypto-utils')
const ECCUtils = require('./../../helpers/ecc-utils')
const bencode = require('bencode')

module.exports = function (contactStorage){

    const _createContactArgs = contactStorage.createContactArgs;
    contactStorage.createContactArgs = createContactArgs;

    function createContactArgs ( keyPair, nonce, protocol, address = '127.0.0.1', port = 8000){

        const identity = CryptoUtils.sha256( Buffer.concat( [ nonce, keyPair.publicKey ] ) );

        const out = [
            ..._createContactArgs( keyPair, nonce, identity, protocol, address, port),
            Math.floor(new Date().getTime() / 1000),
        ]

        const signature = ECCUtils.sign( keyPair.privateKey, CryptoUtils.sha256( bencode.encode( out ) ) );

        return [
            ...out,
            signature, //empty signature
        ];
    }


}

