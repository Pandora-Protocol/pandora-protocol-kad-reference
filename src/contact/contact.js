const Validation = require('./../helpers/validation')
const bencode = require('bencode');

module.exports = class Contact{

    constructor(  kademliaNode ){

        this._kademliaNode = kademliaNode;

        this._argumentIndex = 1;

        this.app = arguments[this._argumentIndex++].toString();
        if (this.app !== KAD_OPTIONS.VERSION.APP)
            throw "Contact App is not matching"

        this.version = arguments[this._argumentIndex++];
        if (this.version < KAD_OPTIONS.VERSION.VERSION_COMPATIBILITY )
            throw "Contact Version is not compatible"

        this._keys = ['app', 'version'];
        this._keysFilter = {};

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
            if (!filter[key] && !this._keysFilter[key])
                arr.push( this[ key ])

        return arr;
    }

    fromContact(otherContact){

        for (const key of this._keys)
            if (!this._keysFilter[key])
                this[this._keys[key]] = undefined;

        this._keys = otherContact._keys;

        for (const key of otherContact._keys)
            this[key] = otherContact[key];

    }

    toArrayBuffer(){
        return bencode.encode(this.toArray());
    }

    toJSON(hex = false){

        const obj = {};
        for (const key of this._keys)
            if (!this._keysFilter[key]) {
                obj[key] = this[key];
                if (Buffer.isBuffer(obj[key])) obj[key] = obj[key].toString( hex ? 'hex' : '');
            }

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

    isContactAcceptableForKademliaRouting(){
        return true;
    }

}
