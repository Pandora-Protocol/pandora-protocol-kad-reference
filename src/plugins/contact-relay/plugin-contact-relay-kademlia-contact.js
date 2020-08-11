const ContactType = require('./contact-type')
const ContactAddressProtocolType = require('./../../contact/contact-address-protocol-type')
const PluginNodeWebsocket = require('../node-websocket/index')

const Contact = require('../../contact/contact')
const bencode = require('bencode');

module.exports = function(kademliaNode) {

    kademliaNode.plugins.contactPlugins.push({
        create,
    })

    function create(){

        const _toArray = this.toArray.bind(this);
        this.toArray = toArray;

        const _toJSON = this.toJSON.bind(this);
        this.toJSON = toJSON;

        const _getProtocol = this.getProtocol.bind(this)
        this.getProtocol = getProtocol;

        if (this.contactType === ContactType.CONTACT_TYPE_RELAY){
            this.relay = arguments[this._additionalParameters++];
            this.relayContact = Contact.fromArray(this._kademliaNode, bencode.decode(this.relay) );
        }

        function toArray(){

            const out = _toArray(...arguments);

            if (this.contactType === ContactType.CONTACT_TYPE_RELAY)
                out.push(this.relay);

            return out;
        }

        function toJSON() {

            const out = _toJSON();

            if (this.contactType === ContactType.CONTACT_TYPE_RELAY)
                out.relay = this.relay.toString('hex');

            return out;
        }


        function getProtocol(command, data){

            if (command === 'RELAY_JOIN')
                return PluginNodeWebsocket.utils.convertProtocolToWebSocket(this.protocol);

            return _getProtocol(command, data);
        }

    }



}