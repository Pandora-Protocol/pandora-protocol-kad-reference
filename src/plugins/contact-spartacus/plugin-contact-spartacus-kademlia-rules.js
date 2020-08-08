module.exports = function (kademliaRules){

    const __welcomeIfNewNode = kademliaRules._welcomeIfNewNode.bind(kademliaRules);
    kademliaRules._welcomeIfNewNode = _welcomeIfNewNode;

    function _welcomeIfNewNode(contact, cb = ()=>{} ){

        const oldContact = this._kademliaNode.routingTable.map[ contact.identityHex ];
        if (oldContact ){

            //at least 15 seconds
            if ( oldContact.contact.updateContactNewer( contact) )
                return cb(null, "timestamp updated");
            else
                return cb(new Error('Already have'));

        }

        return __welcomeIfNewNode(contact, cb);

    }

}