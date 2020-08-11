const Validation = require('./../helpers/validation')
const StringUtils = require('./../helpers/string-utils')
const bencode = require('bencode');

module.exports = class Contact{

    constructor(  kademliaNode, app, version, identity ){

        this._kademliaNode = kademliaNode;

        if (Buffer.isBuffer(app)) app = app.toString('ascii')
        if (Buffer.isBuffer(version)) version = version.toString('ascii')

        if (app !== KAD_OPTIONS.VERSION.APP)
            throw "Contact App is not matching"

        if (version < KAD_OPTIONS.VERSION.VERSION_COMPATIBILITY )
            throw "Contact Version is not compatible"

        this.app = app;
        this.version = version;

        this.identity = identity;

        this._additionalParameters = 4;

        for (let i=0; i < kademliaNode.plugins.contactPlugins.length; i++)
            if (kademliaNode.plugins.contactPlugins[i].createInitialize)
                kademliaNode.plugins.contactPlugins[i].createInitialize.call(this, ...arguments);

        for (let i=0; i < kademliaNode.plugins.contactPlugins.length; i++)
            kademliaNode.plugins.contactPlugins[i].create.call(this, ...arguments);

    }

    clone(){
        return Contact.fromArray( this._kademliaNode, this.toArray() );
    }

    //used for bencode
    toArray(){
        return [ this.app, this.version, this.identity ];
    }

    toArrayBuffer(){
        return bencode.encode(this.toArray());
    }

    //used for bencode
    static fromArray(kademliaNode, arr){
        return new Contact( ...[ kademliaNode, ...arr] );
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

    importContactNewer(newContact){

    }

    contactUpdated(){

    }

}
