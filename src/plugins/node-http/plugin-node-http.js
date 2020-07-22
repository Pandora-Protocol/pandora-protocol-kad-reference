const PluginNodeHTTPKademliaRules = require('./plugin-node-http-kademlia-rules')

module.exports = function (kademliaNode){

    PluginNodeHTTPKademliaRules(kademliaNode.rules);

    return {
        name: "PluginNodeHTTP",
        version: "0.1",
        success: true,
    }
}
