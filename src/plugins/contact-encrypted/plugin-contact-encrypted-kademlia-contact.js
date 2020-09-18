const ECCUtils = require('../../helpers/ecc-utils')

module.exports = function(options) {

    return class MyContact extends options.Contact{

        constructor() {
            super(...arguments);

            const publicKey = arguments[this._argumentIndex++];
            if (!Buffer.isBuffer(publicKey) || publicKey.length !== 65) throw "Invalid Contact Public Key";
            this.publicKey = publicKey;

            this._keys.push('publicKey');
        }

        //sign signature
        sign(buffer){
            return ECCUtils.sign(this.privateKey, buffer );
        }

        //verify signature
        verify(buffer, signature){
            return ECCUtils.verify(this.publicKey, buffer, signature );
        }

    }

}