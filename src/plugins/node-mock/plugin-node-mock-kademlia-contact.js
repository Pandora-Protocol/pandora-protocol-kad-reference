const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')

module.exports = function (options) {

    return class NewContact extends options.Contact{

        constructor(  ) {

            super(...arguments);

            this.mockId = arguments[this._argumentIndex++].toString('ascii');
            if (typeof this.mockId !== "string")
                throw "MockId is invalid"

            this._keys.push('mockId');
            this._allKeys.push('mockId');

        }

        getProtocol(command){
            return ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK;
        }

    }

}