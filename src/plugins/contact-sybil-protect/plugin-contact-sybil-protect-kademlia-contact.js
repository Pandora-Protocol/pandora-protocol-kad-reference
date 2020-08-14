const CryptoUtils = require('../../helpers/crypto-utils')
const ECCUtils = require('../../helpers/ecc-utils')

module.exports = function(options) {

    return class MyContact extends options.Contact {

        constructor() {

            super(...arguments);

            const nonceMessage = this.getNonceMessage();

            const sybilPublicKeyIndex = this.nonce[0];
            if ( sybilPublicKeyIndex >= KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS.length) throw "Nonce invalid sybil public key index";
            const sybilPublicKey = KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[ sybilPublicKeyIndex ].publicKey;

            const sybilSignature = Buffer.alloc(64);
            this.nonce.copy(sybilSignature, 0, 1)

            if ( !ECCUtils.verifySignature( sybilPublicKey, nonceMessage, sybilSignature ))
                throw "Nonce is invalid";

        }

        get _spartacusNonceLength(){
            return 65;
        }

        getNonceMessage (){
            const publicKey = this.publicKey;
            return CryptoUtils.sha256( publicKey );
        }


    }

}