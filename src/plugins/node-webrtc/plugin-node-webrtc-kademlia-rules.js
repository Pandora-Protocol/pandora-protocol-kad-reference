const bencode = require('bencode');
const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const BufferHelper = require('../../helpers/buffer-utils')

module.exports = function (options) {

    return class MyRules extends options.Rules {

        constructor() {

            super(...arguments);

            if (!this._skipProtocolEncryptions) this._skipProtocolEncryptions = {};
            this._skipProtocolEncryptions[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC] = true;

            this._webRTCActiveConnectionsByContactsMap = {};
            this._webRTCActiveConnections = [];

            if (ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC === undefined) throw new Error('WebSocket protocol was not initialized.');
            this._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC] = {
                sendSerialize: this._webrtcSendSerialize.bind(this),
                sendSerialized: this._webrtcSendSerialized.bind(this),
                receiveSerialize: this._webrtcReceiveSerialize.bind(this),
            }

        }


        _webrtcSendSerialize (dstContact, command, data) {
            const id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
            return {
                id,
                out: [ command, data ],
            }
        }

        _webrtcSendSerialized (id, dstContact, protocol, command, data, cb)  {

            const buffer = bencode.encode( [0, data] );

            //connected once already already
            const webRTC = this._webRTCActiveConnectionsByContactsMap[dstContact.identityHex];
            if (!webRTC)
                cb(new Error('WebRTC Not connected'));

            this.pending.pendingAdd('webrtc:'+webRTC.id, id, () => cb(new Error('Timeout')), cb );

            webRTC.sendData( id, buffer )
        }

        _webrtcReceiveSerialize (id, srcContact, out ) {
            return bencode.encode( BufferHelper.serializeData([ 1, out] ) )
        }

    }

}