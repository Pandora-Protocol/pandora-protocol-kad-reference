module.exports = class ContactsMap {

    constructor(kademliaNode) {

        this._kademliaNode = kademliaNode;

        this._map = {};
    }

    updateContact(contact){

        if (!this._map[contact.identityHex]) {
            this._map[contact.identityHex] = contact;
            this._kademliaNode.rules._welcomeIfNewNode( contact );
        }

        return this._map[contact.identityHex];

    }

    getContact(identityHex){
        return this._map[identityHex];
    }

}