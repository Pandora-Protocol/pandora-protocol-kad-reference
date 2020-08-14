const PluginSortedListKademliaRules = require('./plugin-sorted-list-kademlia-rules')
const PluginSortedListCrawler = require('./plugin-sorted-list-crawler')
const PluginSortedListStoreMemory = require('./plugin-sorted-list-store-memory')

module.exports = {
    plugin: function(kademliaNode, options){

        options.Rules = PluginSortedListKademliaRules( options );
        options.Crawler = PluginSortedListCrawler( options );
        options.Store = PluginSortedListStoreMemory( options );

        return {
            name: "PluginSortedList",
            version: "0.1",
            success: true,
        }

    },
}
