const Contact = require('../../contact/contact')

module.exports = function (options){

    return class MyRules extends options.Rules {

        _welcomeIfNewNode(contact, cb = ()=>{} ){

            const oldContact = this._kademliaNode.routingTable.map[ contact.identityHex ];
            if (oldContact ){

                //at least 15 seconds
                if ( oldContact.contact.isContactNewer( contact ) ) {
                    oldContact.contact = contact;
                    console.log("updated")
                    return cb(null, "timestamp updated");
                } else
                    return cb(new Error('Already have'));

            }

            return super._welcomeIfNewNode(contact, cb);

        }


    }


}