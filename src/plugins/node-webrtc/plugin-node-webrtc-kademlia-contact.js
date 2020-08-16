const ContactWebRTCType = require('./contact-webrtc-type')

module.exports = function(options){

    return class MyContact extends options.Contact {

        constructor() {

            super(...arguments);

            this.webrtcType = arguments[this._argumentIndex++];
            if (!ContactWebRTCType._map[this.webrtcType])
                throw "Contact WebRTC type is invalid";


            this._keys.push('webrtcType');
            this._allKeys.push('webrtcType');

        }

    }

}