const Validation = require('./../helpers/validation')
const bencode = require('bencode');

module.exports = class Contact{

    constructor(  kademliaNode ){

        this._kademliaNode = kademliaNode;

        this._argumentIndex = 1;

        this.app = arguments[this._argumentIndex++].toString('ascii');
        if (this.app !== KAD_OPTIONS.VERSION.APP)
            throw "Contact App is not matching"

        this.version = arguments[this._argumentIndex++];
        if (this.version < KAD_OPTIONS.VERSION.VERSION_COMPATIBILITY )
            throw "Contact Version is not compatible"

        this.identity = arguments[this._argumentIndex++];

        this._keys = ['app', 'version', 'identity'];
        this._allKeys = ['app', 'version', 'identity'];

    }

    addKey(key){

        if (this._keys.indexOf(key) === -1){

            for (let i = this._allKeys.indexOf(key)-1; i >= 0; i--){
                const pos = this._keys.indexOf( this._allKeys[i] );
                if (pos !== -1) {
                    this._keys.splice(pos+1, 0, key);
                    return;
                }
            }
        }

        this._keys.shift(key);

    }

    clone(){
        return Contact.fromArray( this._kademliaNode, this.toArray() );
    }

    //used for bencode
    toArray(){

        let arr = [];
        for (const key in this._keys)
            arr.push( this[ this._keys[key] ])

        return arr;
    }

    toArrayBuffer(){
        return bencode.encode(this.toArray());
    }

    //used for bencode
    static fromArray(kademliaNode, arr){
        return new kademliaNode.Contact( ...[ kademliaNode, ...arr] );
    }

    toJSON(){
        return {
            app: this.app,
            version: this.version,
            identity: this.identityHex,
        }
    }

    get identity(){
        return this._identity;
    }

    set identity(newIdentity){
        Validation.validateIdentity(newIdentity)
        this._identity = newIdentity;
        this.identityHex = this.identity.toString('hex')
    }

    contactUpdated(){

    }

}
