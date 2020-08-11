const PluginContactRelayKademliaRules = require('./plugin-contact-relay-kademlia-rules')
const PluginContactRelayKademliaContact = require('./plugin-contact-relay-kademlia-contact')
const PluginContactRelayContactStorage = require('./plugin-contact-relay-kademlia-contact-storage')

module.exports = function (kademliaNode){

    if (!kademliaNode.plugins.hasPlugin('PluginNodeWebsocket'))
        throw "PluginNodeWebsocket is required";

    PluginContactRelayKademliaRules(kademliaNode.rules);
    PluginContactRelayKademliaContact(kademliaNode);
    PluginContactRelayContactStorage(kademliaNode.contactStorage);

    return {
        name: "PluginContactRelay",
        version: "0.1",
        success: true,
    }
}
