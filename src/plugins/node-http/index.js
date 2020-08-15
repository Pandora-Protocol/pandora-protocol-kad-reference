const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const ContactType = require('../contact-type/contact-type')


const PluginNodeHttpKademliaRules = require('./plugin-node-http-kademlia-rules')
const PluginNodeHttpKademliaContact = require('./plugin-node-http-kademlia-contact')
const PluginNodeHttpKademliaContactStorage = require('./plugin-node-http-kademlia-contact-storage')

module.exports = {
    plugin: function (kademliaNode, options){

        if (!kademliaNode.plugins.hasPlugin('PluginContactType'))
            throw "PluginContactType is required";

        options.Rules = PluginNodeHttpKademliaRules(options);
        options.Contact = PluginNodeHttpKademliaContact(options);
        options.ContactStorage = PluginNodeHttpKademliaContactStorage(options);

        return {
            name: "PluginNodeHTTP",
            version: "0.1",
            success: true,
        }

    },
    initialize: function (){
        ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP = 1;
        ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS = 2;
        ContactAddressProtocolType._map[1] = true;
        ContactAddressProtocolType._map[2] = true;

        ContactType.CONTACT_TYPE_ENABLED = 2;
        ContactType._map[2] = true;

    },
}
