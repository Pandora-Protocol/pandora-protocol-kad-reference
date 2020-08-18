const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const PluginNodeWebRTCKademliaRules = require('./plugin-node-webrtc-kademlia-rules')
const PluginNodeWebRTCKademliaContact = require('./plugin-node-webrtc-kademlia-contact')
const PluginNodeWebRTCKademliaContactStorage = require('./plugin-node-webrtc-kademlia-contact-storage')
const PluginNodeWebRTCRendezvousKademliaRules = require('./plugin-node-webrtc-rendezvous-kademlia-rules')

module.exports = {

    plugin: function(kademliaNode, options){

        if (!kademliaNode.plugins.hasPlugin('PluginContactRendezvous'))
            throw "PluginContactRendezvous is required";

        options.Contact = PluginNodeWebRTCKademliaContact(options);
        options.ContactStorage = PluginNodeWebRTCKademliaContactStorage(options);
        options.Rules = PluginNodeWebRTCKademliaRules(options);
        options.Rules = PluginNodeWebRTCRendezvousKademliaRules(options);

        return {
            name: "PluginNodeWebRTC",
            version: "0.1",
            success: true,
        }

    },

    initialize: function(){

        ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC = 5;
        ContactAddressProtocolType._map[5] = true;

    },

}
