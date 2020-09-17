
const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const bencode = require('bencode');

const WebRTCConnectionRemote = require('./connection/webrtc-connection-remote')

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

        async _requestIceCandidateWebRTCConnection(req, srcContact, [sourceIdentity, candidate]){

            try{

                const sourceIdentityHex = sourceIdentity.toString('hex');

                const webRTC = this._webRTCActiveConnectionsByContactsMap[ sourceIdentityHex ];
                if (!webRTC) return [0];

                candidate = bencode.decode(candidate);
                webRTC.processData(candidate);

                webRTC.addIceCandidate(candidate);

            }catch(err){
                return [];
            }

            return [1] ;

        }

        sendRequestIceCandidateWebRTCConnection(contact, sourceIdentity, candidate){
            return this.send(contact, 'REQ_ICE', [sourceIdentity, candidate ])
        }

        _rendezvousIceCandidateWebRTCConnection(req, srcContact, [finalIdentity, candidate]){

            const finalIdentityHex = finalIdentity.toString('hex');

            const ws = this._webSocketActiveConnectionsByContactsMap[ finalIdentityHex ];
            if (!ws || !ws.isWebSocket) return [];

            this.sendRequestIceCandidateWebRTCConnection(ws.contact, srcContact.identity, candidate);

        }

        sendRendezvousIceCandidateWebRTConnection(contact, identity, candidate){
            return this.send(contact, 'RNDZ_ICE', [identity, bencode.encode(candidate) ])
        }

        async _requestWebRTCConnection(req, srcContact, data){

            let webRTC ;

            try{

                const info = await this._kademliaNode.rules.receiveSerialized( req, 0, undefined, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET, data, {returnNotAllowed: true});

                const contact = info[0];
                this._welcomeIfNewNode( contact );

                if (this.alreadyConnected[contact.identityHex]) return [];

                webRTC = new WebRTCConnectionRemote(this, null, contact);

                const [offer, otherPeerMaxChunkSize ] = info[2];

                const chunkMaxSize = webRTC.getMaxChunkSize();
                webRTC.setChunkSize(otherPeerMaxChunkSize, chunkMaxSize);

                webRTC._rtcPeerConnection.onicecandidate = e => {
                    if (e.candidate)
                        this.sendRendezvousIceCandidateWebRTConnection( srcContact, contact.identity, webRTC.processDataOut(e.candidate), (err, out) =>{ })
                }

                webRTC.processData(offer);
                const answer = await webRTC.useInitiatorOffer(offer);

                const finalData = [ webRTC.processDataOut(answer), chunkMaxSize ];

                return this._sendProcess( contact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC, finalData, {forceEncryption: true} );

            }catch(err) {

                if (webRTC)
                    webRTC.closeNow();

            }

        }

        sendRequestWebRTConnection(contact, offer){
            return this.send(contact, 'REQ_WRTC_CON', offer, )
        }

        _rendezvousWebRTCConnection(req, srcContact, [identity, offer] ){

            const identityHex = identity.toString('hex');

            const ws = this._webSocketActiveConnectionsByContactsMap[ identityHex ];
            if (!ws || !ws.isWebSocket) return [];

            return this.sendRequestWebRTConnection(ws.contact, offer );

        }

        sendRendezvousWebRTCConnection(contact, identity, offer){
            return this.send(contact, 'RNDZ_WRTC_CON', [ identity, offer ])
        }

    }

}