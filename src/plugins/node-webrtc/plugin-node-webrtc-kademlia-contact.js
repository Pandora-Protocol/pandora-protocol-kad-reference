const ContactWebRTCType = require('./contact-webrtc-type')
const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
module.exports = function(options){

    return class MyContact extends options.Contact {

        constructor() {

            super(...arguments);

            this.webrtcType = arguments[this._argumentIndex++];
            if (!ContactWebRTCType._map[this.webrtcType])
                throw "Contact WebRTC type is invalid";

            this._keys.push('webrtcType');
            this._allKeys.push('webrtcType');

            this._specialContactProtocolByCommands['RNDZ_WRTC_CON'] = this.convertProtocolToWebSocket.bind(this);
        }

        getProtocol(command){

            if (this.webrtcType === ContactWebRTCType.CONTACT_WEBRTC_TYPE_SUPPORTED)
                return ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC;

            return super.getProtocol(...arguments);

        }

    }

}