const PluginContactSpartacusKademliaContact = require('./plugin-contact-spartacus-kademlia-contact')
const PluginContactSpartacusKademliaRules = require('./plugin-contact-spartacus-kademlia-rules')
const PluginContactSpartacusKademliaContactStorage = require('./plugin-contact-spartacus-kademlia-contact-storage')

module.exports = function (kademliaNode){

    PluginContactSpartacusKademliaContact(kademliaNode);
    PluginContactSpartacusKademliaRules(kademliaNode.rules);
    PluginContactSpartacusKademliaContactStorage(kademliaNode.contactStorage);

    return {
        name: "PluginContactSpartacus",
        version: "0.1",
        success: true,
    }
}