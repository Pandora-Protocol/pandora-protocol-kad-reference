const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const PluginNodeWebsocketKademliaRules = require('./plugin-node-websocket-kademlia-rules')
const PluginNodeWebsocketKademliaContact = require('./plugin-node-websocket-kademlia-contact')

module.exports = {
    plugin: function(kademliaNode, options){

        options.Rules = PluginNodeWebsocketKademliaRules(options)
        options.Contact = PluginNodeWebsocketKademliaContact(options)

        return {
            name: "PluginNodeWebsocket",
            version: "0.1",
            success: true,
        }

    },
    initialize: function(){
        ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET = 3;
        ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_SECURED_WEBSOCKET = 4;
        ContactAddressProtocolType._map[3] = true;
        ContactAddressProtocolType._map[4] = true;
    },
}
