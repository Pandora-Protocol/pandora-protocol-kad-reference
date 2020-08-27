const ContactWebRTCType = require('./contact-webrtc-type')
const ContactType = require('../contact-type/contact-type')
const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
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

                try{

                    if (err) return cb(null, []);

                    const contact = info[0];
                    this._welcomeIfNewNode(req, contact);

                    const alreadyConnected = this._alreadyConnected[contact.identityHex];
                    if (alreadyConnected) return cb(null, []);

                    const webRTC = new WebRTCConnectionRemote();
                    webRTC.init(this, contact);

                    this.pending.pendingAdd(
                        'rendezvous:webRTC:'+contact.identityHex,
                        undefined, //newly
                        err => {
                            if (webRTC)
                                webRTC.close(false);
                            cb(err || new Error('Timeout'))
                        },
                        out => {},
                        KAD_OPTIONS.T_RESPONSE_TIMEOUT
                    );

                    const [offer, otherPeerMaxChunkSize ] = info[2];

                    const chunkMaxSize = webRTC.getMaxChunkSize();
                    webRTC.setChunkSize(otherPeerMaxChunkSize, chunkMaxSize);

                    webRTC._rtcPeerConnection.onicecandidate = e => {
                        if (e.candidate)
                            this.sendRendezvousIceCandidateWebRTConnection(srcContact, contact.identity, webRTC.processDataOut(e.candidate), (err, out) =>{ })
                    }

                    webRTC.processData(offer);
                    webRTC.useInitiatorOffer(offer, (err, answer)=>{

                        if (err) return this.pending.pendingTimeoutAll('rendezvous:webRTC:' + contact.identityHex, timeout => timeout(err) );

                        const data = [ webRTC.processDataOut(answer), chunkMaxSize ];
                        this._sendProcess( contact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC, data, {forceEncryption: true} , (err, data) =>{

                            if (err) return this.pending.pendingTimeoutAll('rendezvous:webRTC:' + contact.identityHex, timeout => timeout(err) );

                            cb(null, data );

                        });

                    })

                }catch(err){
                    cb(null, []);
                }

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

        _sendNow(dstContact, command, data, cb){

            //avoid using webrtc if reverse connection is possible
            if ( this._kademliaNode.contact.contactType !== ContactType.CONTACT_TYPE_ENABLED &&
                dstContact.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS &&
                dstContact.webrtcType === ContactWebRTCType.CONTACT_WEBRTC_TYPE_SUPPORTED &&
                dstContact.rendezvousContact.contactType === ContactType.CONTACT_TYPE_ENABLED){

                const alreadyConnected = this._alreadyConnected[dstContact.identityHex];

                let webRTC;

                if (!alreadyConnected) {
                    webRTC = new WebRTCConnectionInitiator();
                    webRTC.init(this, dstContact);
                }

                //already connected and not request
                if ( alreadyConnected && alreadyConnected._readyState === 'open')
                    return super._sendNow(dstContact, command, data, cb);

                this.pending.pendingAdd(
                    'rendezvous:webRTC:'+dstContact.identityHex,
                    undefined, //newly
                    (err)=> {
                        if (webRTC)
                            webRTC.close(false);
                        cb(err || new Error('Timeout'))
                    },
                    out => super._sendNow(dstContact, command, data, cb),
                    KAD_OPTIONS.T_RESPONSE_TIMEOUT
                );

                if (alreadyConnected) return;

                webRTC._rtcPeerConnection.onicecandidate = e => {
                    if (e.candidate)
                        this.sendRendezvousIceCandidateWebRTConnection(dstContact.rendezvousContact, dstContact.identity, webRTC.processDataOut(e.candidate), (err, out) =>{})
                }

                return webRTC.createInitiatorOffer((err, offer) => {

                    if (err) return this.pending.pendingTimeoutAll('rendezvous:webRTC:' + dstContact.identityHex, timeout => timeout(err) );

                    try{
                        const chunkMaxSize = webRTC.getMaxChunkSize();
                        const data = [ this._kademliaNode.contact, '', [ webRTC.processDataOut(offer), chunkMaxSize] ];

                        //encrypt it
                        this._sendProcess( dstContact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC, data, {forceEncryption: true}, (err, data) =>{

                            if (err) return this.pending.pendingTimeoutAll('rendezvous:webRTC:' + dstContact.identityHex, timeout => timeout(err) );

                            this.sendRendezvousWebRTCConnection(dstContact.rendezvousContact, dstContact.identity, data, (err, info ) => {

                                if (err || !info || !info.length) return this.pending.pendingTimeoutAll('rendezvous:webRTC:' + dstContact.identityHex, timeout => timeout() );

                                this._kademliaNode.rules._receivedProcess( dstContact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET, info, {forceEncryption:  true}, (err, info) =>{

                                    const [answer, otherPeerMaxChunkSize ] =  bencode.decode(info);

                                    webRTC.setChunkSize(otherPeerMaxChunkSize, chunkMaxSize);

                                    webRTC.processData(answer);
                                    webRTC.userRemoteAnswer(answer, (err, out)=>{

                                        if (err) return this.pending.pendingTimeoutAll('rendezvous:webRTC:' + dstContact.identityHex, timeout => timeout(err) );


                                    });

                                });

                            });

                        });

                    }catch(err){
                        this.pending.pendingTimeoutAll('rendezvous:webRTC:' + dstContact.identityHex, timeout => timeout() );
                    }

                })

            }

            super._sendNow(dstContact, command, data, cb);
        }


    }

}