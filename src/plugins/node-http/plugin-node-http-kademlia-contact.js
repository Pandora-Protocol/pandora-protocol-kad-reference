const ContactType = require('../contact-type/contact-type')
const Validation = require('../../helpers/validation')

module.exports = function(options) {

    return class MyContact extends options.Contact {

        constructor() {

            super(...arguments);

            if (this._contactType === ContactType.CONTACT_TYPE_ENABLED){

                this.protocol = arguments[this._argumentIndex++];
                Validation.validateProtocol(this.protocol);

                this.hostname = arguments[this._argumentIndex++].toString();
                Validation.validateHostname(this.hostname);

                this.port = arguments[this._argumentIndex++];
                Validation.validatePort(this.port);

                this.path = arguments[this._argumentIndex++].toString();
                Validation.validatePath(this.path);

            }

            this._keys.push('protocol', 'hostname', 'port', 'path');

            this._specialContactProtocolByCommands = {}

        }

        set contactType(contactType){
            super.contactType = contactType;
            if (this._contactType === ContactType.CONTACT_TYPE_ENABLED){
                delete this._keysFilter.protocol;
                delete this._keysFilter.hostname;
                delete this._keysFilter.port;
                delete this._keysFilter.path;
                this.protocol = undefined;
                this.hostname = undefined;
                this.port = undefined;
                this.path = undefined;
            } else {
                this._keysFilter.protocol = true;
                this._keysFilter.hostname = true;
                this._keysFilter.port = true;
                this._keysFilter.path = true;
            }
        }

        get contactType(){
            return this._contactType;
        }

        getProtocol(command){

            if (this._specialContactProtocolByCommands[command])
                return this._specialContactProtocolByCommands[command](command);

            return this.protocol;
        }

        isContactAcceptableForKademliaRouting(){
            return this._contactType === ContactType.CONTACT_TYPE_ENABLED && super.isContactAcceptableForKademliaRouting();
        }

    }

}