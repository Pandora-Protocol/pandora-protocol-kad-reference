const ContactType = require('./contact-type')
const Contact = require('../../contact/contact')
const bencode = require('bencode');

module.exports = function(kademliaNode) {

    kademliaNode.plugins.contactPlugins.push({
        createInitialize,
        create,
    })

    function createInitialize(){


    }

    function create(){

        const _toArray = this.toArray.bind(this);
        this.toArray = toArray;

        const _toJSON = this.toJSON.bind(this);
        this.toJSON = toJSON;

        const _importContactNewer = this.importContactNewer.bind(this);
        this.importContactNewer = importContactNewer;

        this.contactType = arguments[this._additionalParameters++];
        if (!ContactType._map[this.contactType]) throw "Contact Server Type"

        if (this.contactType === ContactType.CONTACT_TYPE_RELAY){
            this.relay = arguments[this._additionalParameters++];
            this.relayContact = Contact.fromArray(this._kademliaNode, bencode.decode(this.relay) );
        }

        function toArray(){

            const out = _toArray(...arguments);

            out.push(this.contactType);

            if (this.contactType === ContactType.CONTACT_TYPE_RELAY){
                out.push(this.relay);
            }

            return out;
        }

        function toJSON() {

            const out = _toJSON();
            out.contactType = this.contactType;

            if (this.contactType === ContactType.CONTACT_TYPE_RELAY) {
                out.relay = this.relay.toString('hex');
            }

            return out;
        }

        function importContactNewer(newContact){

            _importContactNewer(newContact);

            this.contactType = newContact.contactType;

            if (newContact.contactType === ContactType.CONTACT_TYPE_RELAY){
                this.relay = newContact.relay;
                this.relayContact = newContact.relayContact;
            } else {
                delete this.relay;
                delete this.relayContact;
            }

        }

    }



}