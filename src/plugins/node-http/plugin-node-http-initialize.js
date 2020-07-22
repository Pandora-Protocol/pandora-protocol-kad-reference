const ContactAddressProtocolType = require('./../../contact/contact-address-protocol-type')

module.exports = function(){

    ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP = 0;
    ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS = 1;
    ContactAddressProtocolType._map[0] = true;
    ContactAddressProtocolType._map[1] = true;

};
