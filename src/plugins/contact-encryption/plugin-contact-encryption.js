const PluginContactEncryptedKademliaContact = require('./plugin-contact-encrypted-kademlia-contact')
const PluginContactEncryptedMockKademliaRules = require('./plugin-contact-encrypted-kademlia-rules')

module.exports = function(kademliaNode){

    PluginContactEncryptedKademliaContact(kademliaNode);
    PluginContactEncryptedMockKademliaRules(kademliaNode.rules);

    return {
        name: "PluginContactEncrypted",
        version: "0.1",
        success: true,
    }

}