const PluginStoreValueKademliaCrawler = require('./plugin-store-value-kademlia-crawler')
const PluginStoreValueKademliaRules = require('./plugin-store-value-kademlia-rules')
const PluginStoreValueKademliaMemory = require('./plugin-store-value-memory')

module.exports = {
    plugin: function(kademliaNode, options){

        options.Rules = PluginStoreValueKademliaRules( options );
        options.Crawler = PluginStoreValueKademliaCrawler( options );
        options.Store = PluginStoreValueKademliaMemory( options );

        return {
            name: "PluginStoreValue",
            version: "0.1",
            success: true,
        }

    },
}
