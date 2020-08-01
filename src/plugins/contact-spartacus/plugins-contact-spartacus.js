const PluginContactSpartacusKademliaContact = require('./plugins-contact-spartacus-kademlia-contact')
const PluginContactSpartacusKademliaRules = require('./plugins-contact-spartacus-kademlia-rules')

module.exports = function (kademliaNode){

    PluginContactSpartacusKademliaContact(kademliaNode);
    PluginContactSpartacusKademliaRules(kademliaNode.rules);

    return {
        name: "PluginContactSpartacus",
        version: "0.1",
        success: true,
    }
}