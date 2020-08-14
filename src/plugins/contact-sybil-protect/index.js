const PluginContactSybilProtectKademliaContact = require('./plugin-contact-sybil-protect-kademlia-contact')
const PluginContactSybilProtectContactStorage = require('./plugin-contact-sybil-protect-contact-storage')

module.exports = {

    plugin: function(kademliaNode, options){

        if (!kademliaNode.plugins.hasPlugin('PluginContactSpartacus'))
            throw "PluginContactSpartacus is required";

        options.Contact = PluginContactSybilProtectKademliaContact(options);
        options.ContactStorage = PluginContactSybilProtectContactStorage(options);

        return {
            name: "PluginContactSybilProtect",
            version: "0.1",
            success: true,
        }
    },
}
