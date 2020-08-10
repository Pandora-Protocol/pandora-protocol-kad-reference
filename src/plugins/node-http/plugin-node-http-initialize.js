const ContactAddressProtocolType = require('./../../contact/contact-address-protocol-type')

module.exports = function(){

    ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP = 1;
    ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS = 2;
    ContactAddressProtocolType._map[1] = true;
    ContactAddressProtocolType._map[2] = true;

};
