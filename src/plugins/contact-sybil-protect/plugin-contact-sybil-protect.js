const PluginContactSybilProtectKademliaContact = require('./plugin-contact-sybil-protect-kademlia-contact')
const PluginContactSybilProtectContactStorage = require('./plugin-contact-sybil-protect-contact-storage')

module.exports = function (kademliaNode){

    PluginContactSybilProtectKademliaContact(kademliaNode);
    PluginContactSybilProtectContactStorage(kademliaNode.contactStorage);

    return {
        name: "PluginContactSybilProtect",
        version: "0.1",
        success: true,
    }

}