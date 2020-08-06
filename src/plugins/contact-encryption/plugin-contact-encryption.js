const PluginContactEncryptedKademliaContact = require('./plugin-contact-encrypted-kademlia-contact')
const PluginContactEncryptedKademliaRules = require('./plugin-contact-encrypted-kademlia-rules')
const PluginContactEncryptedContactStorage = require('./plugin-contact-encrypted-kademlia-contact-storage')

module.exports = function(kademliaNode){

    PluginContactEncryptedKademliaContact(kademliaNode);
    PluginContactEncryptedKademliaRules(kademliaNode.rules);
    PluginContactEncryptedContactStorage(kademliaNode.contactStorage);

    return {
        name: "PluginContactEncrypted",
        version: "0.1",
        success: true,
    }

}