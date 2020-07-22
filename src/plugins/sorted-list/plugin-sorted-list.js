const PluginSortedListKademliaRules = require('./plugin-sorted-list-kademlia-rules')
const PluginSortedListCrawler = require('./plugin-sorted-list-crawler')
const PluginSortedListStoreMemory = require('./plugin-sorted-list-store-memory')

module.exports = function (kademliaNode) {

    PluginSortedListKademliaRules( kademliaNode.rules );
    PluginSortedListCrawler( kademliaNode.crawler );

    if (kademliaNode._store.type === "memory")
        PluginSortedListStoreMemory( kademliaNode._store );

    return {
        name: "PluginSortedList",
        version: "0.1",
        success: true,
    }

}
