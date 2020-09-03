module.exports = function (options){

    return class MyRules extends options.Rules {

        constructor() {
            super(...arguments);
        }

        _welcomeIfNewNode(req, contact ){

            const found = this._kademliaNode.routingTable.map[ contact.identityHex ] || this._kademliaNode.rules.alreadyConnected[ contact.identityHex ];

            if (found) {

                const oldContact = found.contact;

                //at least 15 seconds
                if ( oldContact.isContactNewer( contact ) ) {

                    this._kademliaNode.updateContact(contact);
                    return true;

                } else
                    return false;

            }

            return super._welcomeIfNewNode(req, contact);

        }

    }

}