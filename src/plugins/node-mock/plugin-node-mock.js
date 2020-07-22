const PluginNodeMockKademliaRules = require('./plugin-node-mock-kademlia-rules')

module.exports = function (kademliaNode) {

    PluginNodeMockKademliaRules(kademliaNode.rules);

    return {
        name: "PluginNodeMock",
        version: "0.1",
        success: true,
    }

}
