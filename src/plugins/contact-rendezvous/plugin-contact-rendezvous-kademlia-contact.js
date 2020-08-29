const ContactType = require('../contact-type/contact-type')
const bencode = require('bencode');

module.exports = function(options) {

    return class MyContact extends options.Contact{

        constructor() {

            super(...arguments);

            if (this.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS) {

                this.rendezvous = arguments[this._argumentIndex++];
                this.rendezvousContact = this._kademliaNode.createContact( bencode.decode(this.rendezvous) );

                this._keys.push('rendezvous');

            }

            this._allKeys.push('rendezvous');

            this._specialContactProtocolByCommands['RNDZ_JOIN'] = this.convertProtocolToWebSocket.bind(this);
        }

    }

}