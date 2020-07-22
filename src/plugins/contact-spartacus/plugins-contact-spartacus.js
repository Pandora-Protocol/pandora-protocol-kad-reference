const PluginContactSpartacusKademliaContact = require('./plugins-contact-spartacus-kademlia-contact')

module.exports = function (kademliaNode){

    PluginContactSpartacusKademliaContact(kademliaNode);

    return {
        name: "PluginContactSpartacus",
        version: "0.1",
        success: true,
    }
}