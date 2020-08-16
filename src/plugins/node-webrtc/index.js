module.exports = {
    plugin: function(kademliaNode, options){

        if (!this._kademliaNode.plugins.hasPlugin('PluginContactRelay'))
            throw "PluginContactRelay is required";

        return {
            name: "PluginNodeWebRTC",
            version: "0.1",
            success: true,
        }

    },
}
