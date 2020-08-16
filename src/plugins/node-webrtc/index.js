module.exports = {
    plugin: function(kademliaNode, options){

        if (!this._kademliaNode.plugins.hasPlugin('PluginContactRendezvous'))
            throw "PluginContactRendezvous is required";

        return {
            name: "PluginNodeWebRTC",
            version: "0.1",
            success: true,
        }

    },
}
