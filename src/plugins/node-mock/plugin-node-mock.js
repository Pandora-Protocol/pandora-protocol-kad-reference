const PluginNodeMockKademliaRules = require('./plugin-node-mock-kademlia-rules')
const PluginNodeMockKademliaContact = require('./plugin-node-mock-kademlia-contact')
const PluginNodeMockKademliaContactStorage = require('./plugin-node-mock-kademlia-contact-storage')

module.exports = function (kademliaNode) {

    PluginNodeMockKademliaRules(kademliaNode.rules);
    PluginNodeMockKademliaContact(kademliaNode);
    PluginNodeMockKademliaContactStorage(kademliaNode.contactStorage);

    return {
        name: "PluginNodeMock",
        version: "0.1",
        success: true,
    }

}
