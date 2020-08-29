const bencode = require('bencode');
const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const BufferHelper = require('../../helpers/buffer-utils')
const ContactWebRTCType = require('./contact-webrtc-type')
const ContactType = require('../contact-type/contact-type')
const WebRTCConnectionInitiator = require('./webrtc/webrtc-connection-initiator')

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

        _createWebRTC( dstContact, protocol, cb ) {

            if ( dstContact.contactType !== ContactType.CONTACT_TYPE_RENDEZVOUS ||
                dstContact.webrtcType !== ContactWebRTCType.CONTACT_WEBRTC_TYPE_SUPPORTED &&
                dstContact.rendezvousContact.contactType !== ContactType.CONTACT_TYPE_ENABLED) {
                return cb(new Error('Invalid contact for webRTC'));
            }

            const webRTC = new WebRTCConnectionInitiator(this);
            webRTC.initializeWebRTC( dstContact);

             webRTC.createInitiatorOffer((err, offer) => {

                if (err) {
                    webRTC.close();
                    return cb(err);
                }

                let chunkMaxSize, data;

                chunkMaxSize = webRTC.getMaxChunkSize();
                data = [ this._kademliaNode.contact, '', [ webRTC.processDataOut(offer), chunkMaxSize] ];

                //encrypt it
                this._sendProcess( dstContact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC, data, {forceEncryption: true}, (err, data) =>{

                    if (err){
                        webRTC.close();
                        return cb(err);
                    }

                    this.sendRendezvousWebRTCConnection(dstContact.rendezvousContact, dstContact.identity, data, (err, info ) => {

                        if (err || !info || !info.length){
                            webRTC.close();
                            return cb(new Error('Rendezvous error'));
                        }

                        this._kademliaNode.rules._receivedProcess( dstContact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET, info, {forceEncryption:  true}, (err, info) =>{

                            if (err){
                                webRTC.close();
                                return cb(new Error('Answer Decoding error'));
                            }

                            try{

                                webRTC._rtcPeerConnection.onicecandidate = e => {
                                    if (e.candidate)
                                        this.sendRendezvousIceCandidateWebRTConnection(dstContact.rendezvousContact, dstContact.identity, webRTC.processDataOut(e.candidate), (err, out) =>{})
                                }

                                const [answer, otherPeerMaxChunkSize ] =  bencode.decode(info);
                                webRTC.setChunkSize(otherPeerMaxChunkSize, chunkMaxSize);
                                webRTC.processData(answer);

                                webRTC.userRemoteAnswer(answer, (err, out)=>{

                                    if (err){
                                        webRTC.close();
                                        return cb(err);
                                    }

                                    cb(null, webRTC);

                                });

                            }catch(err){
                                webRTC.close();
                                return cb(err);
                            }


                        });

                    });

                });

            })

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
            if (webRTC) return webRTC.sendWebRTCWaitAnswer(id, buffer, cb);

            this._createWebRTC( dstContact, protocol,(err, webRTC)=>{
                if (err) return cb(err);
                webRTC.sendWebRTCWaitAnswer( id, buffer, cb);
            })

        }

        _webrtcReceiveSerialize (id, srcContact, out ) {
            return bencode.encode( BufferHelper.serializeData([ 1, out] ) )
        }

    }

}