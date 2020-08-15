const ContactType = require('../contact-type/contact-type')
const Validation = require('../../helpers/validation')

module.exports = function(options) {

    return class MyContact extends options.Contact {

        constructor() {

            super(...arguments);

            if (this.contactType === ContactType.CONTACT_TYPE_ENABLED){

                this.protocol = arguments[this._argumentIndex++];
                Validation.validateProtocol(this.protocol);

                this.hostname = arguments[this._argumentIndex++].toString('ascii');
                Validation.validateHostname(this.hostname);

                this.port = arguments[this._argumentIndex++];
                Validation.validatePort(this.port);

                this.path = arguments[this._argumentIndex++].toString('ascii');
                Validation.validatePath(this.path);

                this._keys.push('protocol', 'hostname', 'port', 'path');
                this._allKeys.push('protocol', 'hostname', 'port', 'path');

            }


        }

        getProtocol(command, data){
            return this.protocol;
        }

    }

}