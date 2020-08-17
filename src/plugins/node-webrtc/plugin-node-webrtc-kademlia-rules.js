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
             *
             */
            this._commands['REQ_ICE'] = this.requestIceCandidateWebRTCConnection.bind(this);

            /**
             * Sending an ICE candidate to the Rendezvous relay which will later forwarded the packet to the other peer.
             */
            this._commands['RNDZ_ICE'] = this.rendezvousIceCandidateWebRTCConnection.bind(this);

            /**
             * Forwarding the message to the 3rd party to establish a WebRTC connection with a requester.
             */
            this._commands['REQ_WRTC_CON'] = this.requestWebRTCConnection.bind(this);

            /**
             * Sending an initiator offer to Rendezvous to establish a WebRTC connection with a third party receiver
             */
            this._commands['RNDZ_WRTC_CON'] = this.rendezvousWebRTCConnection.bind(this);

            this._webRTCActiveConnectionsByContactsMap = {};
            this._webRTCActiveConnections = [];

        }

        _addWebRTConnection(contact, webRTCConnection){
            this._alreadyConnected[contact.identityHex] = webRTCConnection;
            this._webRTCActiveConnectionsByContactsMap[contact.identityHex] = webRTCConnection;
            this._webRTCActiveConnections.push(webRTCConnection)
            
            webRTCConnection.ondisconnect = ()=>{

                if (this._alreadyConnected[contact.identityHex] === webRTCConnection)
                    delete this._alreadyConnected[contact.identityHex];

                if (this._webRTCActiveConnectionsByContactsMap[contact.identityHex] === webRTCConnection) {
                    delete this._webRTCActiveConnectionsByContactsMap[contact.identityHex];

                    for (let i=this._webRTCActiveConnections.length-1; i>=0; i--) {
                        this._webRTCActiveConnections.splice(i, 1);
                        break;
                    }

                }

            }
        }

        requestIceCandidateWebRTCConnection(req, srcContact, [sourceIdentity, candidate], cb){

            try{

                sourceIdentity = sourceIdentity.toString('hex');

                const webRTCConnection = this._webRTCActiveConnectionsByContactsMap[ sourceIdentity ];
                if (!webRTCConnection) return cb(new Error('Node is not connected'));

                candidate = bencode.decode(candidate);
                for (const key in candidate)
                    if (Buffer.isBuffer(candidate[key]) )
                        candidate[key] = candidate[key].toString();

                webRTCConnection.addIceCandidate(candidate);

                cb(null, 1);

            }catch(err){
                cb(new Error('Invalid contact'));
            }


        }

        sendRequestIceCandidateWebRTCConnection(contact, sourceIdentity, candidate, cb){
            this.send(contact, 'REQ_ICE', [sourceIdentity, candidate ], cb)
        }

        rendezvousIceCandidateWebRTCConnection(req, srcContact, [finalIdentity, candidate], cb){

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

        requestWebRTCConnection(req, srcContact, [contact, offer], cb){

            try{

                contact = this._kademliaNode.createContact( contact );
                if (contact) this._welcomeIfNewNode(req, contact);

                if (this._alreadyConnected[contact.identityHex]) return cb(new Error('Already connected'));

                offer = bencode.decode(offer);
                for (const key in offer)
                    if (Buffer.isBuffer(offer[key]) )
                        offer[key] = offer[key].toString();

                const webRTCConnection = new WebRTCConnectionRemote();
                this._addWebRTConnection(contact, webRTCConnection);

                webRTCConnection.onicecandidate = e => {
                    if (e.candidate)
                        this.sendRendezvousIceCandidateWebRTConnection(srcContact, contact.identity, e.candidate, (err, out) =>{

                        })
                }

                webRTCConnection.useInitiatorOffer(offer, (err, answer)=>{

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

        rendezvousWebRTCConnection(req, srcContact, [identity, offer], cb){

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

                const requestExistsAlready = !!this._pending['rendezvous:webrtc:' + destContact.identityHex];

                this._pendingAdd('rendezvous:webRTCConnection:'+destContact.identityHex, ()=> cb(new Error('Timeout')), (out) => super.send(destContact, command, data, cb), 2 * KAD_OPTIONS.T_RESPONSE_TIMEOUT);

                if (requestExistsAlready) return;
                else {

                    const webRTCConnection = new WebRTCConnectionInitiator();
                    this._addWebRTConnection(destContact, webRTCConnection);

                    webRTCConnection.onicecandidate = e => {
                        if (e.candidate)
                            this.sendRendezvousIceCandidateWebRTConnection(destContact.rendezvousContact, destContact.identity, e.candidate, (err, out) =>{

                            })
                    }

                    return webRTCConnection.createInitiatorOffer((err, offer) => {

                        if (err)return cb(err)
                        this.sendRendezvousWebRTCConnection(destContact.rendezvousContact, destContact.identity, offer, (err, answer ) => {

                            if (err || !answer) return this._pendingTimeoutAll('rendezvous:webRTCConnection:' + destContact.identityHex, err);

                            for (const key in answer)
                                if (Buffer.isBuffer(answer[key]) )
                                    answer[key] = answer[key].toString();

                            webRTCConnection.userRemoteAnswer(answer, (err, out)=>{

                                if (err) return this._pendingTimeoutAll('rendezvous:webRTCConnection:' + destContact.identityHex, err);


                            });

                        });

                    })

                }

            }

            super.send(destContact, command, data, cb);
        }

    }

}