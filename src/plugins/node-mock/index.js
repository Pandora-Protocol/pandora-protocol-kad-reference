const PluginNodeMockKademliaRules = require('./plugin-node-mock-kademlia-rules')
const PluginNodeMockKademliaContact = require('./plugin-node-mock-kademlia-contact')
const PluginNodeMockKademliaContactStorage = require('./plugin-node-mock-kademlia-contact-storage')
const ContactAddressProtocolType = require('./../../contact/contact-address-protocol-type')

module.exports = {

    plugin: function (kademliaNode, options) {

        options.Rules = PluginNodeMockKademliaRules(options);
        options.Contact = PluginNodeMockKademliaContact(options);
        options.ContactStorage = PluginNodeMockKademliaContactStorage(options);

        return {
            name: "PluginNodeMock",
            version: "0.1",
            success: true,
        }

    },
    initialize: function (){

        ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK = 300;
        ContactAddressProtocolType._map[300] = true;

    },
}
