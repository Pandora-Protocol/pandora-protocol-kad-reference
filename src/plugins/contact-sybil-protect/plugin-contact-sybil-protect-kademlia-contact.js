const CryptoUtils = require('../../helpers/crypto-utils')
const Validation = require('../../helpers/validation')

module.exports = function(options) {

    return class MyContact extends options.Contact {

        constructor() {

            super(...arguments);

            this.sybilProtectIndex = arguments[this._argumentIndex++];

            this._keys.push('sybilProtectIndex');

            Validation.validateSybilProtectSignature(this.sybilProtectIndex, [], this.nonce, this.getNonceMessage());

        }

        get _spartacusNonceLength(){
            return 64;
        }

        getNonceMessage (){
            return CryptoUtils.sha256( this.publicKey );
        }

        isContactAcceptableForKademliaRouting(){
            return (this.sybilProtectIndex > 0) && super.isContactAcceptableForKademliaRouting();
        }


    }

}