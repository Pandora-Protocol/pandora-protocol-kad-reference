const PluginReverseConnectionKademliaRules = require('./plugin-reverse-connection-kademlia-rules')
const PluginReverseConnectionKademliaContact = require('./plugin-reverse-connection-kademlia-contact')

module.exports = {

    plugin: function (kademliaNode, options) {

        if (!kademliaNode.plugins.hasPlugin('PluginContactRendezvous'))
            throw "PluginContactRendezvous is required";

        options.Rules = PluginReverseConnectionKademliaRules(options);
        options.Contact = PluginReverseConnectionKademliaContact(options);

        return {
            name: "PluginContactRendezvous",
            version: "0.1",
            success: true,
        }

    }

}