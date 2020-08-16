const PluginContactIdentityKademliaContact = require('./plugin-contact-identity-kademlia-contact')
const PluginContactIdentityKademliaContactStorage = require('./plugin-contact-identity-kademlia-contact-storage')

module.exports = {

    plugin: function (kademliaNode, options) {

        if (kademliaNode.plugins.hasPlugin('PluginContactSpartacus'))
            throw "PluginContactSpartacus is not compatible with contact identity";

        options.Contact = PluginContactIdentityKademliaContact(options);
        options.ContactStorage = PluginContactIdentityKademliaContactStorage(options);

        return {
            name: "PluginContactIdentity",
            version: "0.1",
            success: true,
        }

    }

}