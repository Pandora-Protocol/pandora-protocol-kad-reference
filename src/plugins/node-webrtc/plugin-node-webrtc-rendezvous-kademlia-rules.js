
const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const bencode = require('bencode');

const WebRTCConnectionRemote = require('./webrtc/webrtc-connection-remote')

module.exports = function (options) {

    return class MyRules extends options.Rules {

        constructor() {

            super(...arguments);

            /**
             * Forwarding the message ( ICE candidate ) to the party for processing.
             */
            this._commands['REQ_ICE'] = this._requestIceCandidateWebRTCConnection.bind(this);

            /**
             * Initiator/Receiver will send an ICE candidate (as message) to the Rendezvous relay to forward it to the other peer.
             */
            this._commands['RNDZ_ICE'] = this._rendezvousIceCandidateWebRTCConnection.bind(this);

            /**
             * The rendezvous will forward the message to the receiver to establish a WebRTC connection with an initiator.
             */
            this._commands['REQ_WRTC_CON'] = this._requestWebRTCConnection.bind(this);

            /**
             * Initiator sends an offer to the Rendezvous to establish a WebRTC connection with a receiver.
             */
            this._commands['RNDZ_WRTC_CON'] = this._rendezvousWebRTCConnection.bind(this);

        }

        _requestIceCandidateWebRTCConnection(req, srcContact, [sourceIdentity, candidate], cb){

            //return;

            sourceIdentity = sourceIdentity.toString('hex');

            const webRTC = this._webRTCActiveConnectionsByContactsMap[ sourceIdentity ];
            if (!webRTC) return cb(null, []);

            try{

                candidate = bencode.decode(candidate);
                webRTC.processData(candidate);

                webRTC._rtcPeerConnection.addIceCandidate(candidate)
                    .then( answer => {} )
                    .catch(err => { });

                cb(null, [1] );

            }catch(err){
                return cb(null, []);
            }

        }

        sendRequestIceCandidateWebRTCConnection(contact, sourceIdentity, candidate, cb){
            this.send(contact, 'REQ_ICE', [sourceIdentity, candidate ], cb)
        }

        _rendezvousIceCandidateWebRTCConnection(req, srcContact, [finalIdentity, candidate], cb){

            const finalIdentityHex = finalIdentity.toString('hex');

            const ws = this._webSocketActiveConnectionsByContactsMap[ finalIdentityHex ];
            if (!ws) return cb(null, [] );

            this.sendRequestIceCandidateWebRTCConnection(ws.contact, srcContact.identity, candidate, cb );

        }

        sendRendezvousIceCandidateWebRTConnection(contact, identity, candidate, cb){
            this.send(contact, 'RNDZ_ICE', [identity, bencode.encode(candidate) ], cb)
        }

        _requestWebRTCConnection(req, srcContact, data, cb){

            data = bencode.decode(data);

            this._kademliaNode.rules.receiveSerialized( req, 0, undefined, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET, data, {returnNotAllowed: true}, (err, info) =>{

                if (err) return cb(null, []);

                const contact = info[0];
                this._welcomeIfNewNode(req, contact);

                if (this.alreadyConnected[contact.identityHex]) return cb(null, []);

                const webRTC = new WebRTCConnectionRemote(this);
                webRTC.initializeWebRTC(contact);

                const [offer, otherPeerMaxChunkSize ] = info[2];

                const chunkMaxSize = webRTC.getMaxChunkSize();
                webRTC.setChunkSize(otherPeerMaxChunkSize, chunkMaxSize);

                webRTC._rtcPeerConnection.onicecandidate = e => {
                    if (e.candidate)
                        this.sendRendezvousIceCandidateWebRTConnection(srcContact, contact.identity, webRTC.processDataOut(e.candidate), (err, out) =>{ })
                }

                webRTC.processData(offer);
                webRTC.useInitiatorOffer(offer, (err, answer)=>{

                    if (err){
                        webRTC.close();
                        return cb(null, []);
                    }

                    const data = [ webRTC.processDataOut(answer), chunkMaxSize ];
                    this._sendProcess( contact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC, data, {forceEncryption: true} , (err, data) =>{

                        if (err){
                            webRTC.close();
                            return cb(null, []);
                        }

                        cb(null, data );

                    });

                })

            });

        }

        sendRequestWebRTConnection(contact, offer, cb){
            this.send(contact, 'REQ_WRTC_CON', offer, cb)
        }

        _rendezvousWebRTCConnection(req, srcContact, [identity, offer], cb){

            const identityHex = identity.toString('hex');

            const ws = this._webSocketActiveConnectionsByContactsMap[ identityHex ];
            if (!ws) return cb(null, [] );

            this.sendRequestWebRTConnection(ws.contact, offer, cb );

        }

        sendRendezvousWebRTCConnection(contact, identity, offer, cb){
            this.send(contact, 'RNDZ_WRTC_CON', [ identity, bencode.encode(offer) ], cb)
        }

    }

}