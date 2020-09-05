const PluginContactSpartacusKademliaContact = require('./plugin-contact-spartacus-kademlia-contact')
const PluginContactSpartacusKademliaContactsMap = require('./plugin-contact-spartacus-kademlia-contacts-map')
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
        options.ContactsMap = PluginContactSpartacusKademliaContactsMap(options);

        const _createContact = kademliaNode.createContact.bind(kademliaNode);
        kademliaNode.createContact = function (arr, update = true) {

            const contact = _createContact(arr, false);

            //validate signature
            if (!contact.verifyContact() )
                throw "Invalid Contact Spartacus Signature";

            contact.identity = contact.computeContactIdentity()

            return update ? this.contactsMap.updateContact(contact) : contact;
        }

        return {
            name: "PluginContactSpartacus",
            version: "0.1",
            success: true,
        }

    }

}
