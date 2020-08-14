const PluginContactSpartacusKademliaContact = require('./plugin-contact-spartacus-kademlia-contact')
const PluginContactSpartacusKademliaRules = require('./plugin-contact-spartacus-kademlia-rules')
const PluginContactSpartacusKademliaContactStorage = require('./plugin-contact-spartacus-kademlia-contact-storage')

module.exports = {

    plugin: function(kademliaNode, options){

        if (!kademliaNode.plugins.hasPlugin('PluginContactEncrypted'))
            throw "PluginContactEncrypted is required";

        options.Contact = PluginContactSpartacusKademliaContact(options);
        options.Rules = PluginContactSpartacusKademliaRules(options);
        options.ContactStorage = PluginContactSpartacusKademliaContactStorage(options);

        return {
            name: "PluginContactSpartacus",
            version: "0.1",
            success: true,
        }

    }

}
