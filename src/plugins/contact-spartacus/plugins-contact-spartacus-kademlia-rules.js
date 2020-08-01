module.exports = function (kademliaRules){

    const __welcomeIfNewNode = kademliaRules._welcomeIfNewNode.bind(kademliaRules);
    kademliaRules._welcomeIfNewNode = _welcomeIfNewNode;

    function _welcomeIfNewNode(contact, cb = ()=>{} ){


        const oldContact = this._kademliaNode.routingTable.map[ contact.identityHex ];
        if (oldContact ){

            if ( oldContact.contact.timestamp - contact.timestamp >= global.KAD_OPTIONS.PLUGINS.CONTACT_SPARTACUS.T_CONTACT_TIMESTAMP_DIFF_UPDATE  ) { //at least 15 seconds
                oldContact.contact.timestamp = contact.timestamp;
                oldContact.contact.signature = contact.signature;
                oldContact.contact.address = contact.address;
                return cb(null, "timestamp updated");
            } else
                return cb(new Error('Already have'));

        }

        return __welcomeIfNewNode(contact, cb);

    }

}