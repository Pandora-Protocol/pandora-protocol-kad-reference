const ContactAddressProtocolType = require('./../../contact/contact-address-protocol-type')

module.exports = function(){

    ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET = 2;
    ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_SECURED_WEBSOCKET = 3;
    ContactAddressProtocolType._map[2] = true;
    ContactAddressProtocolType._map[3] = true;

}
