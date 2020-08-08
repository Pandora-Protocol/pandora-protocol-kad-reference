const bencode = require('bencode');
const ECCUtils = require('../../helpers/ecc-utils')
const CryptoUtils = require('../../helpers/crypto-utils')

module.exports = function(kademliaNode) {

    if (!kademliaNode.plugins.hasPlugin('PluginContactEncrypted'))
        throw "PluginContactEncrypted is required";

    kademliaNode.plugins.contactPlugins.push({
        createInitialize,
        create,
    })

    function createInitialize(){
        this._spartacusNonceLength = 0;
    }

    function create(  ){

        const nonce = arguments[this._additionalParameters++];
        if (!Buffer.isBuffer(nonce) || nonce.length !== this._spartacusNonceLength) throw "Invalid Contact Public Key";
        this.nonce = nonce;

        const timestamp = arguments[this._additionalParameters++];
        if (typeof timestamp !== "number") throw "Invalid timestamp";

        const time = new Date().getTime() / 1000;
        if (timestamp > time + KAD_OPTIONS.PLUGINS.CONTACT_SPARTACUS.T_CONTACT_TIMESTAMP_MAX_DRIFT) throw "Invalid timestamp max drift."
        this.timestamp = timestamp;

        const signature = arguments[this._additionalParameters++];
        if (!Buffer.isBuffer(signature) || signature.length !== 64) throw "Invalid Contact Public Key";
        this.signature = signature;

        const _toArray = this.toArray.bind(this);
        this.toArray = toArray;

        const _toJSON = this.toJSON.bind(this);
        this.toJSON = toJSON;

        this.sign = sign;
        this.verifySignature = verifySignature;
        this.verifyContactIdentity = verifyContactIdentity;
        this.computeContactIdentity = computeContactIdentity;
        this.updateContactNewer = updateContactNewer;

        const skipVerifySpartacus = arguments[this._additionalParameters++];
        if (!skipVerifySpartacus ) {

            //validate signature
            if (!this.verifySignature() )
                throw "Invalid Contact Spartacus Signature";

            //validate identity
            if (!this.verifyContactIdentity() )
                throw "Invalid Contact Spartacus Identity";

        }

        //used for bencode
        function toArray(notIncludeSignature){

            const out = _toArray(...arguments);
            out.push(this.nonce);
            out.push(this.timestamp);

            if (!notIncludeSignature)
                out.push(this.signature);

            return out;
        }

        function toJSON(){
            return {
                ..._toJSON(),
                nonce: this.nonce,
                timestamp: this.timestamp,
                signature: this.signature,
            }
        }

        //sign signature
        function sign(){
            const buffer = bencode.encode( this.toArray(true) );
            const msg = CryptoUtils.sha256(buffer);
            return ECCUtils.sign(this.privateKey, msg);
        }

        //verify signature
        function verifySignature(){
            const buffer = bencode.encode( this.toArray(true) );
            const msg = CryptoUtils.sha256(buffer);
            return ECCUtils.verifySignature(this.publicKey, msg, this.signature );
        }

        function computeContactIdentity(){
            const buffer = Buffer.concat([ this.nonce, this.publicKey ] );
            const identity = CryptoUtils.sha256(buffer);
            return identity;
        }

        function verifyContactIdentity(){
            const identity = this.computeContactIdentity();
            return this.identity.equals(identity);
        }

        function updateContactNewer(newContact){

            //at least 15 seconds
            if ( this.timestamp - newContact.timestamp >= KAD_OPTIONS.PLUGINS.CONTACT_SPARTACUS.T_CONTACT_TIMESTAMP_DIFF_UPDATE  ) {
                this.timestamp = newContact.timestamp;
                this.signature = newContact.signature;
                this.address = newContact.address;
                return true;
            }

            return false;

        }

    }

}