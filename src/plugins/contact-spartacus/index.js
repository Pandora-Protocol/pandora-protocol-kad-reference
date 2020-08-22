const PluginContactSpartacusKademliaContact = require('./plugin-contact-spartacus-kademlia-contact')
const PluginContactSpartacusKademliaRules = require('./plugin-contact-spartacus-kademlia-rules')
const PluginContactSpartacusKademliaContactStorage = require('./plugin-contact-spartacus-kademlia-contact-storage')

module.exports = {

    plugin: function(kademliaNode, options){

        if (!kademliaNode.plugins.hasPlugin('PluginContactEncrypted'))
            throw "PluginContactEncrypted is required";

        if (kademliaNode.plugins.hasPlugin('PluginContactIdentity'))
            throw "PluginContactIdentity is not compatible with ContactSpartacus";

        options.Contact = PluginContactSpartacusKademliaContact(options);
        options.Rules = PluginContactSpartacusKademliaRules(options);
        options.ContactStorage = PluginContactSpartacusKademliaContactStorage(options);

        const _createContact = kademliaNode.createContact.bind(kademliaNode);
        kademliaNode.createContact = function () {

            const contact = _createContact(...arguments);

            //validate signature
            if (!contact.verifyContact() )
                throw "Invalid Contact Spartacus Signature";

            contact.identity = contact.computeContactIdentity()

            return contact;
        }

        kademliaNode.updateContact = function(newContact){

            const oldContact = this.routingTable.map[ newContact.identityHex ];
            oldContact.contact = newContact;

            if (this.rules._alreadyConnected)
                if (this.rules._alreadyConnected[oldContact.identityHex])
                    this.rules._alreadyConnected[oldContact.identityHex].contact = newContact;


        }

        return {
            name: "PluginContactSpartacus",
            version: "0.1",
            success: true,
        }

    }

}
