const ContactType = require('../contact-type/contact-type')

module.exports = function(options) {

    return class Rules extends options.Rules {

        constructor() {

            super(...arguments);

            this._commands['REV_CON'] = this._reverseConnect.bind(this);
            this._commands['REQ_REV_CON'] = this._requestReverseConnect.bind(this);
            this._commands['RNDZ_REV_CON'] = this._rendezvousReverseConnection.bind(this);

        }

        _reverseConnect(req, srcContact, data, cb){

            this.pending.pendingResolveAll('rendezvous:reverseConnection:' + srcContact.identityHex,  resolve => resolve(null, true ));
            cb(null, [1] );

        }

        sendReverseConnect(contact, cb){
            this.send(contact, 'REV_CON', [], cb)
        }

        _requestReverseConnect(req, srcContact, [contact], cb ){

            try{

                this._kademliaNode.createContact( contact );
                this.sendReverseConnect( contact, cb );

            }catch(err){
                cb(null, []);
            }

        }

        sendRequestReverseConnect(contact, contactFinal,  cb){
            this.send(contact, 'REQ_REV_CON', [contactFinal], cb)
        }

        _rendezvousReverseConnection(req, srcContact, [identity], cb){

            try{

                const identityHex = identity.toString('hex');
                const ws = this._webSocketActiveConnectionsByContactsMap[ identityHex ];
                if (!ws) return cb(null, []);

                this.sendRequestReverseConnect(ws.contact, srcContact, cb );

            }catch(err){
                cb(null, []);
            }

        }

        sendRendezvousReverseConnection(contact, identity, cb){
            this.send(contact, 'RNDZ_REV_CON', [ identity],  cb);
        }

        _sendNow(dstContact, command, data, cb){

            if ( this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_ENABLED &&
                !this.alreadyConnected[dstContact.identityHex] &&
                dstContact.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS &&
                dstContact.rendezvousContact.contactType === ContactType.CONTACT_TYPE_ENABLED){

                //reverse connection is pending...
                const requestExistsAlready = !!this.pending.list['rendezvous:reverseConnection:' + dstContact.identityHex];

                this.pending.pendingAdd(
                    'rendezvous:reverseConnection:'+dstContact.identityHex,
                    undefined, //newly
                    () => cb(new Error('Timeout')),
                    () => super._sendNow(dstContact, command, data, cb),
                    KAD_OPTIONS.T_RESPONSE_TIMEOUT
                );

                if (requestExistsAlready) return;
                else return this.sendRendezvousReverseConnection( dstContact.rendezvousContact, dstContact.identity, (err, out) => {

                    if (err || !out || !out.length) this.pending.pendingTimeoutAll('rendezvous:reverseConnection:'+dstContact.identityHex, timeout => timeout() );
                    //already solved... if successful

                }  );

            }

            super._sendNow(dstContact, command, data, cb);
        }


    }

}