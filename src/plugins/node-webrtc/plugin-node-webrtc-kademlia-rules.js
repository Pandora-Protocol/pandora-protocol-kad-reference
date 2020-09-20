const bencode = require('bencode');
const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const BufferHelper = require('../../helpers/buffer-utils')
const ContactWebRTCType = require('./contact-webrtc-type')
const ContactType = require('../contact-type/contact-type')
const WebRTCConnectionInitiator = require('./connection/webrtc-connection-initiator')

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

        _establishConnection(dstContact){

            if (dstContact.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS && dstContact.webrtcType === ContactWebRTCType.CONTACT_WEBRTC_TYPE_SUPPORTED )
                return this._createWebRTC(dstContact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC );

            return super._establishConnection(dstContact);

        }

        async _createWebRTC( dstContact, protocol ) {

            if ( dstContact.contactType !== ContactType.CONTACT_TYPE_RENDEZVOUS ||
                dstContact.webrtcType !== ContactWebRTCType.CONTACT_WEBRTC_TYPE_SUPPORTED &&
                dstContact.rendezvousContact.contactType !== ContactType.CONTACT_TYPE_ENABLED) {
                throw 'Invalid contact for webRTC';
            }

            const webRTC = new WebRTCConnectionInitiator(this, null, dstContact);

            webRTC._rtcPeerConnection.onicecandidate = e => {
                if (e.candidate)
                    this.sendRendezvousIceCandidateWebRTConnection(dstContact.rendezvousContact, dstContact.identity, webRTC.processDataOut(e.candidate), (err, out) =>{})
            }

            return new Promise((resolve, reject)=>{

                webRTC._rtcPeerConnection.onnegotiationneeded = async () => {

                    try{

                        const offer = await webRTC.createInitiatorOffer();

                        let chunkMaxSize, data;

                        chunkMaxSize = webRTC.getMaxChunkSize();
                        data = [ this._kademliaNode.contact, '', [ webRTC.processDataOut(offer), chunkMaxSize] ];

                        //encrypt it
                        const processedData = await this._sendProcess( dstContact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC, data, {forceEncryption: true} );

                        if ( !processedData || !processedData.length) throw 'processed data error';

                        const info = await this.sendRendezvousWebRTCConnection(dstContact.rendezvousContact, dstContact.identity, processedData);

                        if ( !info ) throw 'Rendezvous error';

                        const received = await this._kademliaNode.rules._receivedProcess( dstContact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET, info, {forceEncryption:  true} );

                        const [answer, otherPeerMaxChunkSize ] =  bencode.decode(received);
                        webRTC.setChunkSize(otherPeerMaxChunkSize, chunkMaxSize);
                        webRTC.processData(answer);

                        await webRTC.userRemoteAnswer(answer);

                        resolve(webRTC);

                    }catch(err){
                        webRTC.closeNow();
                        reject(err);
                    }

                }

            })

        }

        _webrtcSendSerialize (dstContact, command, data) {
            const id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
            return {
                id,
                out: [ command, data ],
            }
        }

        async _webrtcSendSerialized (id, dstContact, protocol, command, data)  {

            const buffer = bencode.encode( [0, data] );

            //connected once already already
            let webRTC = this._webRTCActiveConnectionsByContactsMap[dstContact.identityHex];
            if (!webRTC)
                webRTC = await this._createWebRTC( dstContact, protocol );

            return webRTC.sendConnectionWaitAnswer( id, buffer);

        }

        _webrtcReceiveSerialize (id, srcContact, out ) {
            return bencode.encode( BufferHelper.serializeData([ 1, out] ) )
        }

    }

}