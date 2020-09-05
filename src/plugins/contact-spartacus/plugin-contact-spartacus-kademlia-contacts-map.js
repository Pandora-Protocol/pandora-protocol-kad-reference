module.exports = function (options){

    return class MyContactsMap extends options.ContactsMap{

        updateContact(contact){

            const oldContact = this._map[contact.identityHex];

            if ( !oldContact ) {
                this._map[contact.identityHex] = contact;
                this._kademliaNode.rules._welcomeIfNewNode( contact );
                return contact;
            }

            if (oldContact.isContactNewer( contact )){
                oldContact.fromContact(contact)
                return oldContact;
            }

            return oldContact;

        }

    }
}