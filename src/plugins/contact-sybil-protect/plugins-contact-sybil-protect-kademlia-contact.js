module.exports = function(kademliaNode) {

    if (!kademliaNode.plugins.hasPlugin('PluginContactSpartacus'))
        throw "PluginContactSpartacus is required";

    kademliaNode.plugins.contactPlugins.push({
        createInitialize,
        create,
    })

    function createInitialize(){
        this._spartacusNonceLength = 65;
    }

    function create(){
    }

}