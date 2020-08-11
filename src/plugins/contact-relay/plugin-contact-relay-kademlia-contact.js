const ContactType = require('./contact-type')
const ContactAddressProtocolType = require('./../../contact/contact-address-protocol-type')

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

        const _importContactNewer = this.importContactNewer.bind(this);
        this.importContactNewer = importContactNewer;

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

        function importContactNewer(newContact){

            _importContactNewer(newContact);

            if (newContact.contactType === ContactType.CONTACT_TYPE_RELAY){
                this.relay = newContact.relay;
                this.relayContact = newContact.relayContact;
            } else {
                delete this.relay;
                delete this.relayContact;
            }

        }

        function getProtocol(command, data){

            if (command === 'RELAY_JOIN'){
                if (this.protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP) return ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;
                if (this.protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS) return ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_SECURED_WEBSOCKET;
                throw 'Invalid protocol';
            }

            return _getProtocol(command, data);
        }

    }



}