const PluginContactSybilProtectKademliaContact = require('./plugin-contact-sybil-protect-kademlia-contact')
const PluginContactSybilProtectContactStorage = require('./plugin-contact-sybil-protect-contact-storage')
const PluginSybilSign = typeof BROWSER === "undefined" ? require('./sybil-sign/sybil-sign-node') : require('./sybil-sign/sybil-sign-browser')

module.exports = {

    plugin: function(kademliaNode, options){

        if (!kademliaNode.plugins.hasPlugin('PluginContactSpartacus'))
            throw "PluginContactSpartacus is required";

        options.Contact = PluginContactSybilProtectKademliaContact(options);
        options.ContactStorage = PluginContactSybilProtectContactStorage(options);
        options.PluginSybilSign = PluginSybilSign;

        const _initializeNode = kademliaNode.initializeNode.bind(kademliaNode);

        kademliaNode.initializeNode = async function (opts){

            if (typeof BROWSER === "undefined")
                if (process.argv.indexOf('set-sybil-protect'))
                    opts.setSybilProtect = 1;

            return _initializeNode(...arguments)

        }

        return {
            name: "PluginContactSybilProtect",
            version: "0.1",
            success: true,
        }
    },
}
