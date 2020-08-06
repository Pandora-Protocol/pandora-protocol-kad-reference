const Validation = require('./../helpers/validation')
const ContactAddress = require('./contact-address')
const StringUtils = require('./../helpers/string-utils')


module.exports = class Contact{

    constructor(  kademliaNode, app, version, identity ){

        this._kademliaNode = kademliaNode;

        if (app !== KAD_OPTIONS.VERSION.APP)
            throw "Contact App is not matching"

        if (version < KAD_OPTIONS.VERSION.VERSION_COMPATIBILITY )
            throw "Contact Version is not compatible"

        this.app = app;
        this.version = version;

        this.identity = identity;

        this.address = new ContactAddress( ...arguments );

        this._additionalParameters = 8;

        for (let i=0; i < kademliaNode.plugins.contactPlugins.length; i++)
            kademliaNode.plugins.contactPlugins[i].createInitialize.call(this, ...arguments);

        for (let i=0; i < kademliaNode.plugins.contactPlugins.length; i++)
            kademliaNode.plugins.contactPlugins[i].create.call(this, ...arguments);

    }

    clone(){
        return Contact.fromArray( this._kademliaNode, this.toArray() );
    }

    //used for bencode
    toArray(){
        return [ this.app, this.version, this.identity, ...this.address.toArray() ];
    }

    //used for bencode
    static fromArray(kademliaNode, arr){

        arr[0] = arr[0].toString('ascii'); //app
        arr[1] = arr[1].toString('ascii'); //version

        arr[4] = arr[4].toString('ascii');
        arr[6] = arr[6].toString('ascii');

        return new Contact( ...[ kademliaNode, ...arr] );
    }

    toJSON(){
        return {
            app: this.app,
            version: this.version,
            identity: this.identityHex,
            address:this.address.toJSON(),
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

}
