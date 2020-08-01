const PluginsContactSybilProtectKademliaContact = require('./plugins-contact-sybil-protect-kademlia-contact')

module.exports = function (kademliaNode){

    PluginsContactSybilProtectKademliaContact(kademliaNode);

    return {
        name: "PluginContactSybilProtect",
        version: "0.1",
        success: true,
    }

}