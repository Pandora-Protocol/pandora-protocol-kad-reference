module.exports = class KademliaNodePlugins {

    constructor(kademliaNode) {
        this._kademliaNode = kademliaNode;

        this.installed = [];
        this._installedMap = {}

        this.contactPlugins = [];
    }

    install(plugins){
        for (const plugin of plugins)
            this._use(plugin);
    }

    //plugin
    _use(plugin){

        if (!plugin || typeof plugin !== "function" ) throw "Invalid plugin";

        const {name, version, success} = plugin(this._kademliaNode);
        const data = {name, version, success};

        this.installed.push( data );
        this._installedMap[name] = data;
    }

    hasPlugin(pluginName){
        return this._installedMap[pluginName];
    }


}