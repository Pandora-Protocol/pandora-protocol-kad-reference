const PluginContactSybilProtectKademliaContact = require('./plugin-contact-sybil-protect-kademlia-contact')
const PluginContactSybilProtectContactStorage = require('./plugin-contact-sybil-protect-contact-storage')
const SybilProtectSignBase = require('./sybil-protect-sign/sybil-protect-sign-base')
const SybilProtectSign = typeof BROWSER === "undefined" ? require('./sybil-protect-sign/sybil-protect-sign-node') : require('./sybil-protect-sign/sybil-protect-sign-browser')

module.exports = {

    plugin: function(kademliaNode, options){

        if (!kademliaNode.plugins.hasPlugin('PluginContactSpartacus'))
            throw "PluginContactSpartacus is required";

        options.Contact = PluginContactSybilProtectKademliaContact(options);
        options.ContactStorage = PluginContactSybilProtectContactStorage(options);
        options.SybilProtectSignBase = SybilProtectSignBase(options);
        options.SybilProtectSign = SybilProtectSign(options);

        kademliaNode.sybilProtectSign = new options.SybilProtectSign();

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
