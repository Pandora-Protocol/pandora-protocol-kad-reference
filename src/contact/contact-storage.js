const BufferUtils = require('./../helpers/buffer-utils')
const bencode = require('bencode')
const Contact = require('./contact')

module.exports = class ContactStorage {

    constructor(kademliaNode) {
        this._kademliaNode = kademliaNode;
    }

    loadContact( cb ){
        this._kademliaNode.storage.getItem('info:contact', (err, out)=>{
            if (err) return cb(err);
            if (!out) return cb(null, null)

            this._setContact( bencode.decode( Buffer.from(out, 'base64') ), false, cb );
        })
    }

    _setContact(contactArgs, saveToStorage, cb){

        this._kademliaNode._contact = Contact.fromArray( this._kademliaNode, contactArgs.args );
        this._kademliaNode._contact.mine = true;

        if (saveToStorage)
            this._kademliaNode.storage.setItem('info:contact', bencode.encode( contactArgs ).toString('base64'), cb );
        else
            cb(null, contactArgs );

    }

    setContact( contactArgs, loadFromStorage = true, saveToStorage = true,  cb){

        if (loadFromStorage)
            this.loadContact( (err, out) =>{

                if (err) return cb(err);
                if (out) return cb(null, out);

                this._setContact( contactArgs, saveToStorage, cb );

            } );
        else
            this._setContact( contactArgs, saveToStorage, cb );
    }

    async createContactArgs( opts ){

        return {
            args: [
                opts.app || KAD_OPTIONS.VERSION.APP,
                opts.version || KAD_OPTIONS.VERSION.VERSION,
                opts.identity || BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH),
            ]
        };
    }

}