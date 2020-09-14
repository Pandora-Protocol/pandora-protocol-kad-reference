const CryptoUtils = require('../../helpers/crypto-utils')
const Validation = require('../../helpers/validation')

module.exports = function(options) {

    return class MyContact extends options.Contact {

        constructor() {

            super(...arguments);

            this.sybilIndex = arguments[this._argumentIndex++];

            this._keys.push('sybilIndex');
            this._allKeys.push('sybilIndex');

            Validation.validateSybilSignature(this.sybilIndex, 0, this.nonce, this.getNonceMessage());

        }

        get _spartacusNonceLength(){
            return 64;
        }

        getNonceMessage (){
            return CryptoUtils.sha256( this.publicKey );
        }

        isContactAcceptableForKademliaRouting(){
            return (this.sybilIndex > 0) && super.isContactAcceptableForKademliaRouting();
        }


    }

}