const PluginNodeHttpKademliaRules = require('./plugin-node-http-kademlia-rules')
const PluginNodeHttpKademliaContact = require('./plugin-node-http-kademlia-contact')
const PluginNodeHttpKademliaContactStorage = require('./plugin-node-http-kademlia-contact-storage')

module.exports = function (kademliaNode){

    PluginNodeHttpKademliaRules(kademliaNode.rules);
    PluginNodeHttpKademliaContact(kademliaNode);
    PluginNodeHttpKademliaContactStorage(kademliaNode.contactStorage);

    return {
        name: "PluginNodeHTTP",
        version: "0.1",
        success: true,
    }
}
