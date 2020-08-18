const ContactWebRTCType = require('./contact-webrtc-type')
const ContactType = require('../contact-type/contact-type')
const bencode = require('bencode');

const WebRTCConnectionRemote = require('./webrtc/webrtc-connection-remote')
const WebRTCConnectionInitiator = require('./webrtc/webrtc-connection-initiator')

const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const BufferHelper = require('../../helpers/buffer-utils')

module.exports = function (options) {

    return class MyRules extends options.Rules {

        constructor() {

            super(...arguments);

            /**
             *
             */
            this._commands['REQ_ICE'] = this._requestIceCandidateWebRTCConnection.bind(this);

            /**
             * Sending an ICE candidate to the Rendezvous relay which will later forwarded the packet to the other peer.
             */
            this._commands['RNDZ_ICE'] = this._rendezvousIceCandidateWebRTCConnection.bind(this);

            /**
             * Forwarding the message to the 3rd party to establish a WebRTC connection with a requester.
             */
            this._commands['REQ_WRTC_CON'] = this._requestWebRTCConnection.bind(this);

            /**
             * Sending an initiator offer to Rendezvous to establish a WebRTC connection with a third party receiver
             */
            this._commands['RNDZ_WRTC_CON'] = this._rendezvousWebRTCConnection.bind(this);

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
            webRTC.protocol  = ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC;
            webRTC.isWebRTC = true;

            this._alreadyConnected[contact.identityHex] = webRTC;
            this._webRTCActiveConnectionsByContactsMap[contact.identityHex] = webRTC;
            this._webRTCActiveConnections.push(webRTC)

            webRTC.onconnect = () => {
                this.pending.pendingResolveAll('rendezvous:webRTC:' + contact.identityHex, (resolve) => resolve(null, true ) );
            }

            webRTC.ondisconnect = ()=>{

                this.pending.pendingTimeoutAll('webrtc:'+webRTC.id, timeout => timeout() );

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
                        this.sendRendezvousWebRTCConnection(destContact.rendezvousContact, destContact.identity, offer, (err, answer ) => {

                            if (err || !answer) return this.pending.pendingTimeoutAll('rendezvous:webRTC:' + destContact.identityHex, timeout => timeout() );

                            webRTC.processData(answer);
                            webRTC.userRemoteAnswer(answer, (err, out)=>{

                                if (err) this.pending.pendingTimeoutAll('rendezvous:webRTC:' + destContact.identityHex, timeout => timeout() );


                            });

                        });

                    })

                }

            }

            super.send(destContact, command, data, cb);
        }



        _webrtcSendSerialize (destContact, command, data) {
            const id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
            return {
                id,
                out: [ command, data ],
            }
        }

        _webrtcSendSerialized (id, destContact, protocol, command, data, cb)  {

            const buffer = bencode.encode( [id, data] );

            //connected once already already
            const webRTC = this._webRTCActiveConnectionsByContactsMap[destContact.identityHex];
            if (!webRTC)
                cb(new Error('WebRTC Not connected'));

            this.pending.pendingAdd('webrtc:'+webRTC.id, id, () => cb(new Error('Timeout')), cb );

            webRTC.sendData( buffer )
        }

        _webrtcReceiveSerialize (id, srcContact, out ) {
            return bencode.encode( BufferHelper.serializeData([ 1, id, out] ) )
        }

    }

}