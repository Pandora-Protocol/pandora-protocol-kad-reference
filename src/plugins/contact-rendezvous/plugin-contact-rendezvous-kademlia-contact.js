const ContactType = require('../contact-type/contact-type')
const bencode = require('bencode');

module.exports = function(options) {

    return class MyContact extends options.Contact{

        constructor() {

            super(...arguments);

            if (this._contactType === ContactType.CONTACT_TYPE_RENDEZVOUS)
                this.rendezvous = arguments[this._argumentIndex++];

            this._keys.push('rendezvous');

            this._specialContactProtocolByCommands['RNDZ_JOIN'] = this.convertProtocolToWebSocket.bind(this);
        }

        set contactType(value){

            super.contactType = value;

            if (this._contactType === ContactType.CONTACT_TYPE_RENDEZVOUS) {
                delete this._keysFilter.rendezvous;
                this._rendezvous = undefined;
                this.rendezvousContact = undefined;
            }
            else
                this._keysFilter.rendezvous = true;
        }

        get contactType(){
            return this._contactType;
        }

        set rendezvous(rendezvous){
            this._rendezvous = rendezvous;
            if (rendezvous)
                this.rendezvousContact = this._kademliaNode.createContact( bencode.decode(this._rendezvous) );
            else this.rendezvousContact = undefined;
        }

        get rendezvous(){
            return this._rendezvous;
        }

    }

}