const Contact = require('../../contact/contact')
const bencode = require('bencode')

module.exports = function (contactStorage){

    const _createContactArgs = contactStorage.createContactArgs;
    contactStorage.createContactArgs = createContactArgs;
    contactStorage.setContact = setContact;
    contactStorage.loadContact = loadContact;
    contactStorage._setContact = _setContact;

    function loadContact( cb ){
        this._kademliaNode._storage.getItem('contact', (err, out)=>{
            if (err) return cb(err);

            out = bencode.decode(Buffer.from(out, 'hex') );
            this._setContact( out[0], out[1], false, cb );
        })
    }

    function createContactArgs ( publicKey, nonce, identity, protocol, address = '127.0.0.1', port = 8000){

        return [
            ..._createContactArgs(identity, protocol, address, port),
            publicKey,
            nonce,
        ];

    }

    function _setContact(privateKey, contactArgs, saveToStorage, cb){

        this._kademliaNode._contact = Contact.fromArray( this._kademliaNode, contactArgs );
        this._kademliaNode._contact.mine = true;
        this._kademliaNode._contact.privateKey = privateKey;

        if (saveToStorage)
            this._kademliaNode._storage.setItem('contact', bencode.encode( [privateKey, contactArgs] ).toString('hex'), cb );
        else
            cb(null, contactArgs );

    }

    function setContact( privateKey, contactArgs, loadFromStorage = true, saveToStorage = true,  cb){

        if (loadFromStorage)
            this.loadContact( (err, out) =>{

                if (err) return this._setContact( privateKey, contactArgs, saveToStorage, cb );
                cb(out);

            } );
        else
            this._setContact( privateKey, contactArgs, saveToStorage, cb );

    }





}