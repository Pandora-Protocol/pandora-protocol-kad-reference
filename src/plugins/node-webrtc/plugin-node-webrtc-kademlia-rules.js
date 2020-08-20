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

        _addWebRTConnection(contact, webRTC){

            webRTC.id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
            webRTC.contact = contact;
            webRTC.contactProtocol  = ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC;
            webRTC.isWebRTC = true;

            this._alreadyConnected[contact.identityHex] = webRTC;
            this._webRTCActiveConnectionsByContactsMap[contact.identityHex] = webRTC;
            this._webRTCActiveConnections.push(webRTC)

            webRTC.onconnect = () => {
                this.pending.pendingResolveAll('rendezvous:webRTC:' + contact.identityHex, resolve => resolve(null, true ) );
            }

            webRTC.ondisconnect = ()=>{

                this.pending.pendingTimeoutAll('webRTC:'+webRTC.id, timeout => timeout() );

                if (this._alreadyConnected[contact.identityHex] === webRTC)
                    delete this._alreadyConnected[contact.identityHex];

                if (this._webRTCActiveConnectionsByContactsMap[contact.identityHex] === webRTC) {
                    delete this._webRTCActiveConnectionsByContactsMap[contact.identityHex];

                    for (let i = this._webRTCActiveConnections.length-1; i >= 0; i--)
                        if (this._webRTCActiveConnections[i] === webRTC){
                            this._webRTCActiveConnections.splice(i, 1);
                            break;
                        }

                }

            }


            webRTC.onmessage = (data) => {

                const decoded = bencode.decode(data);
                const status = decoded[0];
                const id = decoded[1];

                if ( status === 1 ){ //received an answer

                    if (this.pending.list['webRTC:'+webRTC.id] && this.pending.list['webRTC:'+webRTC.id][id])
                        this.pending.pendingResolve('webRTC:'+webRTC.id, id, (resolve) => resolve( null, decoded[2] ));

                } else {

                    this.receiveSerialized( webRTC, id, webRTC.contact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC, decoded[2], {}, (err, buffer )=>{

                        if (err) return;

                        webRTC.sendData(buffer);

                    });

                }

            }

        }




        _webrtcSendSerialize (destContact, command, data) {
            const id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
            return {
                id,
                out: [ command, data ],
            }
        }

        _webrtcSendSerialized (id, destContact, protocol, command, data, cb)  {

            const buffer = bencode.encode( [0, id, data] );

            //connected once already already
            const webRTC = this._webRTCActiveConnectionsByContactsMap[destContact.identityHex];
            if (!webRTC)
                cb(new Error('WebRTC Not connected'));

            this.pending.pendingAdd('webRTC:'+webRTC.id, id, () => cb(new Error('Timeout')), cb );

            webRTC.sendData( buffer )
        }

        _webrtcReceiveSerialize (id, srcContact, out ) {
            return bencode.encode( BufferHelper.serializeData([ 1, id, out] ) )
        }

    }

}