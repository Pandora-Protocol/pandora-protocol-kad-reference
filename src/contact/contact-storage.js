const BufferUtils = require('./../helpers/buffer-utils')
const bencode = require('bencode')
const Contact = require('./contact')

module.exports = class ContactStorage {

    constructor(kademliaNode) {
        this._kademliaNode = kademliaNode;
    }

    _setContact(contactArgs, saveToStorage, cb){

        this._kademliaNode._contact = Contact.fromArray( this._kademliaNode, contactArgs );
        this._kademliaNode._contact.mine = true;

        if (saveToStorage)
            this._kademliaNode._storage.setItem('contact', bencode.encode( contactArgs ).toString('hex'), cb );
        else
            cb(null, contactArgs );

    }

    setContact( contactArgs, loadFromStorage = true, saveToStorage = true,  cb){

        if (loadFromStorage)
            this._kademliaNode._storage.getItem('contact', (err, out)=>{
                if (err) return this._setContact( contactArgs, saveToStorage, cb );
                this._setContact( bencode.decode(Buffer.from(out, 'hex') ), false, cb );
            })
        else
            this._setContact( contactArgs, saveToStorage, cb );
    }

    createContactArgs(identity, protocol, address = '127.0.0.1', port = 8000){

        return [
            KAD_OPTIONS.VERSION.APP,
            KAD_OPTIONS.VERSION.VERSION,
            identity || BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH),
            protocol,
            address,
            port,
            '',
        ]
    }

}