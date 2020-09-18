const bencode = require('bencode');
const ECCUtils = require('../../helpers/ecc-utils')
const CryptoUtils = require('../../helpers/crypto-utils')

module.exports = function(options) {


    return class MyContact extends options.Contact{

        constructor() {

            super(...arguments)

            this.nonce = arguments[this._argumentIndex++];
            if (!Buffer.isBuffer(this.nonce) || this.nonce.length !== this._spartacusNonceLength) throw "Invalid Contact Public Key";

            this.timestamp = arguments[this._argumentIndex++];
            if (typeof this.timestamp !== "number") throw "Invalid timestamp";

            if (this.timestamp > new Date().getTime()/1000 + KAD_OPTIONS.PLUGINS.CONTACT_SPARTACUS.T_CONTACT_TIMESTAMP_MAX_DRIFT) throw "Invalid timestamp max drift."

            this.signature = arguments[this._argumentIndex++];
            if (!Buffer.isBuffer(this.signature) || this.signature.length !== 64) throw "Invalid Contact Public Key";

            this._keys.push('nonce','timestamp','signature');

        }

        toArray(notIncludeSignature){

            const filter = {};
            if (notIncludeSignature) filter['signature'] = true;

            return this._toArray(filter);
        }

        get _spartacusNonceLength(){
            return 0;
        }

        //sign signature
        signContact(){
            const buffer = bencode.encode( this.toArray(true) );
            const msg = CryptoUtils.sha256(buffer);
            return this.sign(msg);
        }

        //verify signature
        verifyContact(){
            const buffer = bencode.encode( this.toArray(true) );
            const msg = CryptoUtils.sha256(buffer);
            return this.verify(msg, this.signature)
        }

        computeContactIdentity(){
            const buffer = Buffer.concat([ this.nonce, this.publicKey ] );
            const identity = CryptoUtils.sha256(buffer);
            return identity;
        }

        verifyContactIdentity(){
            const identity = this.computeContactIdentity();
            return this.identity.equals(identity);
        }

        isContactNewer(newContact){

            //at least 15 seconds
            return newContact.timestamp > this.timestamp;

        }

        contactUpdated(){
            this.timestamp = Math.floor(new Date().getTime() / 1000);
            this.signature = this.signContact();
        }


    }

}