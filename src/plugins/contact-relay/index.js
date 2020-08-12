const PluginContactRelayKademliaRules = require('./plugin-contact-relay-kademlia-rules')
const PluginContactRelayKademliaContact = require('./plugin-contact-relay-kademlia-contact')
const PluginContactRelayContactStorage = require('./plugin-contact-relay-kademlia-contact-storage')

module.exports = {

    plugin: function(kademliaNode, options){

        if (!kademliaNode.plugins.hasPlugin('PluginNodeWebsocket'))
            throw "PluginNodeWebsocket is required";

        options.Rules = PluginContactRelayKademliaRules(options);
        options.Contact = PluginContactRelayKademliaContact(options);
        options.ContactStorage = PluginContactRelayContactStorage(options);

        const _bootstrap = kademliaNode.bootstrap.bind(kademliaNode);
        kademliaNode.bootstrap = bootstrap;

        function bootstrap(contact, first, cb = ()=>{} ){

            _bootstrap(contact, first, (err, out)=>{
                if (err) return cb(err);
                this.rules._setRelayNow(()=> cb( null, out) )
            } )

        }

        return {
            name: "PluginContactRelay",
            version: "0.1",
            success: true,
        }

    },

}
