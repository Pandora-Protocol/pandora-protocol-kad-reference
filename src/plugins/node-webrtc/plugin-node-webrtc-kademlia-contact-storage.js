const WebRTC = require('./webrtc/isomorphic-webrtc')
const ContactWebRTCType = require('./contact-webrtc-type')
const ContactType = require('../contact-type/contact-type')

module.exports = function(options) {

    function _isWebRTCSupported() {

        if (typeof BROWSER === "undefined"){
            return !!WebRTC; //node.js
        }else {
            const isWebRTCSupported = navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia ||
                navigator.msGetUserMedia ||
                window.RTCPeerConnection;

            if (window.navigator.userAgent.indexOf("Edge") > -1)
                return false;

            return !!isWebRTCSupported;

        }

    }

    return class MyContactStorage extends options.ContactStorage {

        async createContactArgs ( opts ){

            const out = await super.createContactArgs(opts);

            return {
                ...out,
                args: [
                    ...out.args,
                    (_isWebRTCSupported() && out.contactType !== ContactType.CONTACT_TYPE_ENABLED) ? ContactWebRTCType.CONTACT_WEBRTC_TYPE_SUPPORTED : ContactWebRTCType.CONTACT_WEBRTC_TYPE_DISABLED ,
                ]
            }
        }

    }

}