const ContactWebRTCType = require('./contact-webrtc-type')
const ContactType = require('../contact-type/contact-type')
const bencode = require('bencode');

const WebRTCConnectionRemote = require('./webrtc/webrtc-connection-remote')
const WebRTCConnectionInitiator = require('./webrtc/webrtc-connection-initiator')

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

            try{

                sourceIdentity = sourceIdentity.toString('hex');

                const webRTC = this._webRTCActiveConnectionsByContactsMap[ sourceIdentity ];
                if (!webRTC) return cb(new Error('Node is not connected'));

                candidate = bencode.decode(candidate);
                webRTC.processData(candidate);

                webRTC.addIceCandidate(candidate)
                    .then( answer => {} )
                    .catch(err => { });

                cb(null, 1);

            }catch(err){
                cb(new Error('Invalid contact'));
            }


        }

        sendRequestIceCandidateWebRTCConnection(contact, sourceIdentity, candidate, cb){
            this.send(contact, 'REQ_ICE', [sourceIdentity, candidate ], cb)
        }

        _rendezvousIceCandidateWebRTCConnection(req, srcContact, [finalIdentity, candidate], cb){

            try{

                const finalIdentityHex = finalIdentity.toString('hex');

                const ws = this._webSocketActiveConnectionsByContactsMap[ finalIdentityHex ];
                if (!ws) return cb(new Error('Node is not connected'));

                this.sendRequestIceCandidateWebRTCConnection(ws.contact, srcContact.identity, candidate, cb );

            }catch(err){
                cb(new Error('Invalid contact'));
            }

        }

        sendRendezvousIceCandidateWebRTConnection(contact, identity, candidate, cb){
            this.send(contact, 'RNDZ_ICE', [identity, bencode.encode(candidate) ], cb)
        }

        _requestWebRTCConnection(req, srcContact, [contact, offer], cb){

            try{

                contact = this._kademliaNode.createContact( contact );
                if (contact) this._welcomeIfNewNode(req, contact);

                if (this._alreadyConnected[contact.identityHex]) return cb(new Error('Already connected'));

                offer = bencode.decode(offer);

                const webRTC = new WebRTCConnectionRemote();
                this._addWebRTConnection(contact, webRTC);

                webRTC.onicecandidate = e => {
                    if (e.candidate)
                        this.sendRendezvousIceCandidateWebRTConnection(srcContact, contact.identity, e.candidate, (err, out) =>{ })
                }

                webRTC.processData(offer);
                webRTC.useInitiatorOffer(offer, (err, answer)=>{

                    if (err) return err;
                    cb(null, answer);

                })


            }catch(err){
                cb(new Error('Invalid Contact'));
            }


        }

        sendRequestWebRTConnection(contact, contactFinal, offer, cb){
            this.send(contact, 'REQ_WRTC_CON', [contactFinal, offer ], cb)
        }

        _rendezvousWebRTCConnection(req, srcContact, [identity, offer], cb){

            try{

                const identityHex = identity.toString('hex');

                const ws = this._webSocketActiveConnectionsByContactsMap[ identityHex ];
                if (!ws) return cb(new Error('Node is not connected'));

                this.sendRequestWebRTConnection(ws.contact, srcContact, offer, cb );

            }catch(err){
                cb(new Error('Invalid contact'));
            }

        }

        sendRendezvousWebRTCConnection(contact, identity, offer, cb){
            this.send(contact, 'RNDZ_WRTC_CON', [ identity, bencode.encode(offer) ], cb)
        }

        send(destContact, command, data, cb){

            //avoid using webrtc if reverse connection is possible
            if ( this._kademliaNode.contact.contactType !== ContactType.CONTACT_TYPE_ENABLED &&
                !this._alreadyConnected[destContact.identityHex] &&
                destContact.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS &&
                destContact.webrtcType === ContactWebRTCType.CONTACT_WEBRTC_TYPE_SUPPORTED &&
                destContact.rendezvousContact.contactType === ContactType.CONTACT_TYPE_ENABLED){

                const requestExistsAlready = !!this.pending.list['rendezvous:webRTC:' + destContact.identityHex];

                this.pending.pendingAdd(
                    'rendezvous:webRTC:'+destContact.identityHex,
                    undefined,
                    ()=> cb(new Error('Timeout')),
                    (out) => super.send(destContact, command, data, cb),
                    4 * KAD_OPTIONS.T_RESPONSE_TIMEOUT
                );

                if (requestExistsAlready) return;
                else {

                    const webRTC = new WebRTCConnectionInitiator();
                    this._addWebRTConnection(destContact, webRTC);

                    webRTC.onicecandidate = e => {
                        if (e.candidate)
                            this.sendRendezvousIceCandidateWebRTConnection(destContact.rendezvousContact, destContact.identity, e.candidate, (err, out) =>{})
                    }

                    return webRTC.createInitiatorOffer((err, offer) => {

                        if (err)return cb(err)
                        const data = [offer, webRTC.getMaxChunkSize() ];

                        this.sendRendezvousWebRTCConnection(destContact.rendezvousContact, destContact.identity, offer, (err, answer ) => {

                            if (err || !answer) return this.pending.pendingTimeoutAll('rendezvous:webRTC:' + destContact.identityHex, timeout => timeout() );

                            webRTC.processData(answer);
                            webRTC.userRemoteAnswer(answer, (err, out)=>{

                                if (err) return this.pending.pendingTimeoutAll('rendezvous:webRTC:' + destContact.identityHex, timeout => timeout() );


                            });

                        });

                    })

                }

            }

            super.send(destContact, command, data, cb);
        }


    }

}