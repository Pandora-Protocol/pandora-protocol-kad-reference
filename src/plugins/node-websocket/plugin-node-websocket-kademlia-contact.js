const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')

module.exports = function (options) {

    return class NewContact extends options.Contact {

        convertProtocolToWebSocket(){
            if (this.protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP) return ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;
            if (this.protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS) return ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET_SECURED;
        }

    }

}

