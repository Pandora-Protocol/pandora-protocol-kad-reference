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

        this._keys = ['app', 'version'];
        this._allKeys = ['app', 'version'];

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
            this._keys.unshift(key);

        }

    }

    clone(){
        return this._kademliaNode.createContact( this.toArray() );
    }

    toArray(){
        return this._toArray();
    }

    //used for bencode
    _toArray(filter = {}){

        let arr = [];
        for (const key of this._keys)
            if (!filter[key])
                arr.push( this[ key ])

        return arr;
    }

    toArrayBuffer(){
        return bencode.encode(this.toArray());
    }

    toJSON(){

        const obj = {};
        for (const key of this._keys)
            obj[key] = this[key];

        return obj;
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
