const bencode = require('bencode');
module.exports = function (options){

    return class MyRules extends options.Rules {

        constructor() {
            super(...arguments);

            this._commands['UPD_CONTACT'] = this.updateContact.bind(this);
        }

        updateContact(req, srcContact, [contact], cb){
            this._welcomeIfNewNode(req, srcContact);

            if (contact && req.isWebSocket){
                try{
                    contact = this._kademliaNode.createContact(contact);
                    this._welcomeIfNewNode(req, contact);
                }catch(err){

                }
            }

            cb(null, [1]);
        }

        sendUpdateContact(contact, cb){

            const data = [];
            if ( this.webSocketActiveConnectionsByContactsMap[contact.identityHex]  )
                data.push(this._kademliaNode.contact);

            this.send(contact, 'UPD_CONTACT', data, cb)
        }


        _welcomeIfNewNode(req, contact, cb = ()=>{} ){

            const oldContact = this._kademliaNode.routingTable.map[ contact.identityHex ];
            if (oldContact ){

                //at least 15 seconds
                if ( oldContact.contact.isContactNewer( contact ) ) {

                    oldContact.contact = contact;
                    if (req.isWebSocket)
                        req.contact = contact;

                    return cb(null, "timestamp updated");
                } else
                    return cb(new Error('Already have'));

            }

            return super._welcomeIfNewNode(req, contact, cb);

        }


    }


}