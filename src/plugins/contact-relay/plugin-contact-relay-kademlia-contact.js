const ContactType = require('./contact-type')
const ContactAddressProtocolType = require('./../../contact/contact-address-protocol-type')

const Contact = require('../../contact/contact')
const bencode = require('bencode');

module.exports = function(options) {

    return class MyContact extends options.Contact{

        constructor() {

            super(...arguments);

            if (this.contactType === ContactType.CONTACT_TYPE_RELAY) {

                this.relay = arguments[this._argumentIndex++];
                this.relayContact = Contact.fromArray(this._kademliaNode, bencode.decode(this.relay) );

                this._keys.push('relay');

            }

            this._allKeys.push('relay');

        }

        getProtocol(command, data){

            if (command === 'RELAY_JOIN')
                return this.convertProtocolToWebSocket();

            return super.getProtocol(command, data);
        }

    }

}