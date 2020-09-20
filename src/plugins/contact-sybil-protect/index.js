const PluginContactSybilProtectKademliaContact = require('./plugin-contact-sybil-protect-kademlia-contact')
const PluginContactSybilProtectContactStorage = require('./plugin-contact-sybil-protect-contact-storage')
const SybilProtectSignerBase = require('./sybil-protect-signer/sybil-protect-signer-base')
const SybilProtectSigner = typeof BROWSER === "undefined" ? require('./sybil-protect-signer/sybil-protect-signer-node') : require('./sybil-protect-signer/sybil-protect-signer-browser')

module.exports = {

    plugin: function(kademliaNode, options){

        if (!kademliaNode.plugins.hasPlugin('PluginContactSpartacus'))
            throw "PluginContactSpartacus is required";

        options.Contact = PluginContactSybilProtectKademliaContact(options);
        options.ContactStorage = PluginContactSybilProtectContactStorage(options);
        options.SybilProtectSignerBase = SybilProtectSignerBase(options);
        options.SybilProtectSigner = SybilProtectSigner(options);

        kademliaNode.sybilProtectSigner = new options.SybilProtectSigner();

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
