const PluginContactEncryptedKademliaContact = require('./plugin-contact-encrypted-kademlia-contact')
const PluginContactEncryptedKademliaRules = require('./plugin-contact-encrypted-kademlia-rules')
const PluginContactEncryptedContactStorage = require('./plugin-contact-encrypted-kademlia-contact-storage')

module.exports = {

    plugin: function(kademliaNode, options){

        options.Contact = PluginContactEncryptedKademliaContact(options);
        options.Rules = PluginContactEncryptedKademliaRules(options);
        options.ContactStorage = PluginContactEncryptedContactStorage(options);

        return {
            name: "PluginContactEncrypted",
            version: "0.1",
            success: true,
        }


    }

}
