const PluginContactRelayKademliaRules = require('./plugin-contact-relay-kademlia-rules')
const PluginContactRelayKademliaContact = require('./plugin-contact-relay-kademlia-contact')
const PluginContactRelayContactStorage = require('./plugin-contact-relay-kademlia-contact-storage')
const PluginContactRelayCrawler = require('./plugin-contact-relay-kademlia-crawler')

const ContactType = require('../contact-type/contact-type')

module.exports = {

    plugin: function(kademliaNode, options){

        if (!kademliaNode.plugins.hasPlugin('PluginNodeWebsocket'))
            throw "PluginNodeWebsocket is required";

        if (!kademliaNode.plugins.hasPlugin('PluginContactType'))
            throw "PluginContactType is required";

        options.Rules = PluginContactRelayKademliaRules(options);
        options.Contact = PluginContactRelayKademliaContact(options);
        options.ContactStorage = PluginContactRelayContactStorage(options);
        options.Crawler = PluginContactRelayCrawler(options);

        const _bootstrap = kademliaNode.bootstrap.bind(kademliaNode);
        kademliaNode.bootstrap = function (contact, first, cb = ()=>{} ){

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

    initialize: function (){

        ContactType.CONTACT_TYPE_RELAY = 3;
        ContactType._map[3] = true;

    }

}
