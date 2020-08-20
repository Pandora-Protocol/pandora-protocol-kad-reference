const ed2curve = require('ed2curve')

module.exports = function(options) {

    return class MyContact extends options.Contact{

        constructor() {
            super(...arguments);

            const publicKey = arguments[this._argumentIndex++];
            if (!Buffer.isBuffer(publicKey) || publicKey.length !== 32) throw "Invalid Contact Public Key";
            this.publicKey = publicKey;

            this._privateKey = undefined;

            this._keys.push('publicKey');
            this._allKeys.push('publicKey');
        }

        set privateKey(privateKey){
            this._privateKey = privateKey;
            this._boxPrivateKey = undefined;
            this._boxPublicKey = undefined;
        }

        get privateKey(){
            return this._privateKey;
        }

        get boxPrivateKey(){
            if (this._boxPrivateKey) return this._boxPrivateKey;
            this._boxPrivateKey = ed2curve.convertSecretKey(this._privateKey);
            return this._boxPrivateKey;
        }

        get boxPublicKey(){
            if (this._boxPublicKey) return this._boxPublicKey;
            this._boxPublicKey = ed2curve.convertPublicKey(this.publicKey);
            return this._boxPublicKey;
        }

    }

}