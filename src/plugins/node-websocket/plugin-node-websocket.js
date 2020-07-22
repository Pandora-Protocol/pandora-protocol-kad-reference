const PluginNodeWebsocketKademliaRules = require('./plugin-node-websocket-kademlia-rules')

module.exports = function (kademliaNode){

    PluginNodeWebsocketKademliaRules(kademliaNode.rules)

    return {
        name: "PluginNodeWebsocket",
        version: "0.1",
        success: true,
    }

}