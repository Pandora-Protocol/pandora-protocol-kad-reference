const ContactWebRTCType = require('./contact-webrtc-type')
const ContactType = require('../contact-type/contact-type')
const bencode = require('bencode');

const WebRTCConnectionReceiver = require('./webrtc/webrtc-connection-receiver')
const WebRTCConnectionInitiator = require('./webrtc/webrtc-connection-initiator')


module.exports = function (options) {

    return class MyRules extends options.Rules {

        constructor() {
            super(...arguments);

            this._commands['REQ_WRTC_CON'] = this.requestWebRTCConnection.bind(this);
            this._commands['RNDZ_WRTC_CON'] = this.rendezvousWebRTCConnection.bind(this);

            this.webRTCActiveConnectionsByContactsMap = {};
            this.webRTCActiveConnections = [];

        }

        requestWebRTCConnection(req, srcContact, [contact, offer], cb){

            try{

                contact = this._kademliaNode.createContact( contact );
                if (contact) this._welcomeIfNewNode(req, contact);

                if (this.webRTCActiveConnectionsByContactsMap[contact.identityHex]) return cb(new Error('Already connected via WebRTC'));
                if (this.webSocketActiveConnectionsByContactsMap[contact.identityHex]) return cb(new Error('Already connected via WebSocket'));

                offer = bencode.decode(offer);
                for (const key in offer)
                    offer[key] = offer[key].toString();

                const webrtcConnection = new WebRTCConnectionReceiver();
                webrtcConnection.useInitiatorOffer(offer, (err, answer)=>{

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

                const ws = this.webSocketActiveConnectionsByContactsMap[ identityHex ];
                if (!ws)
                    return cb(new Error('Node is not connected'));

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
                 !this.webSocketActiveConnectionsByContactsMap[destContact.identityHex] &&
                  destContact.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS &&
                  destContact.webrtcType === ContactWebRTCType.CONTACT_WEBRTC_TYPE_SUPPORTED &&
                  destContact.rendezvousContact.contactType === ContactType.CONTACT_TYPE_ENABLED){

                const requestExistsAlready = !!this._pending['rendezvous:webrtc:' + destContact.identityHex];

                this._pendingAdd('rendezvous:webRTCConnection:'+destContact.identityHex, ()=> cb(new Error('Timeout')), (out) => super.send(destContact, command, data, cb), 2 * KAD_OPTIONS.T_RESPONSE_TIMEOUT);

                if (requestExistsAlready) return;
                else {

                    const webrtcConnection = new WebRTCConnectionInitiator();

                    return webrtcConnection.createInitiatorOffer((err, offer) => {

                        if (err)return cb(err)
                        this.sendRendezvousWebRTCConnection(destContact.rendezvousContact, destContact.identity, offer, (err, answer ) => {

                            if (err) this._pendingTimeoutAll('rendezvous:webRTCConnection:' + destContact.identityHex, err);

                            for (const key in answer)
                                answer[key] = answer[key].toString();

                            webrtcConnection.userReceiverAnswer(answer, (err, out)=>{

                                if (err) return cb(err);
                                this._pendingResolveAll('rendezvous:webRTCConnection:' + destContact.identityHex, resolve => resolve(true) );


                            });

                        });

                    })

                }

            }

            super.send(destContact, command, data, cb);
        }

    }

}