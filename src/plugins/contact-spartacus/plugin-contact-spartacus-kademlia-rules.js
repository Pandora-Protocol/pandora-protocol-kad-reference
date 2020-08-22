module.exports = function (options){

    return class MyRules extends options.Rules {

        constructor() {
            super(...arguments);
        }

        _welcomeIfNewNode(req, contact, cb = ()=>{} ){

            const oldContact = this._kademliaNode.routingTable.map[ contact.identityHex ];
            if (oldContact ){

                //at least 15 seconds
                if ( oldContact.contact.isContactNewer( contact ) ) {

                    this._kademliaNode.updateContact(contact);
                    return cb(null, "timestamp updated");

                } else
                    return cb(new Error('Already have'));

            }

            return super._welcomeIfNewNode(req, contact, cb);

        }

    }

}