const PluginContactRendezvousKademliaRules = require('./plugin-contact-rendezvous-kademlia-rules')
const PluginContactRendezvousKademliaContact = require('./plugin-contact-rendezvous-kademlia-contact')
const PluginContactRendezvousContactStorage = require('./plugin-contact-rendezvous-kademlia-contact-storage')
const PluginContactRendezvousCrawler = require('./plugin-contact-rendezvous-kademlia-crawler')

const ContactType = require('../contact-type/contact-type')

module.exports = {

    plugin: function(kademliaNode, options){

        if (!kademliaNode.plugins.hasPlugin('PluginNodeWebsocket'))
            throw "PluginNodeWebsocket is required";

        if (!kademliaNode.plugins.hasPlugin('PluginContactType'))
            throw "PluginContactType is required";

        options.Rules = PluginContactRendezvousKademliaRules(options);
        options.Contact = PluginContactRendezvousKademliaContact(options);
        options.ContactStorage = PluginContactRendezvousContactStorage(options);
        options.Crawler = PluginContactRendezvousCrawler(options);

        const _bootstrap = kademliaNode.bootstrap.bind(kademliaNode);
        kademliaNode.bootstrap = function (contact, first, cb = ()=>{} ){

            _bootstrap(contact, first, (err, out)=>{
                if (err) return cb(err);
                this.rules._setRendezvousRelayNow(()=> cb( null, out) )
            } )

        }

        return {
            name: "PluginContactRendezvous",
            version: "0.1",
            success: true,
        }

    },

    initialize: function (){

        ContactType.CONTACT_TYPE_RENDEZVOUS = 3;
        ContactType._map[3] = true;

    }

}
