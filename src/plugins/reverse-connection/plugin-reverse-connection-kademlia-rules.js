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
            cb(null, 1);

        }

        sendReverseConnect(contact, cb){
            this.send(contact, 'REV_CON', [], cb)
        }

        _requestReverseConnect(req, srcContact, [contact], cb ){

            if (srcContact) this._welcomeIfNewNode(req, srcContact);

            try{

                contact = this._kademliaNode.createContact( contact );
                if (contact) this._welcomeIfNewNode(req, contact);

                this.sendReverseConnect( contact, cb );

            }catch(err){
                cb(new Error('Invalid Contact'));
            }

        }

        sendRequestReverseConnect(contact, contactFinal,  cb){
            this.send(contact, 'REQ_REV_CON', [contactFinal], cb)
        }

        _rendezvousReverseConnection(req, srcContact, [identity], cb){

            try{

                const identityHex = identity.toString('hex');
                const ws = this._webSocketActiveConnectionsByContactsMap[ identityHex ];
                if (!ws)
                    return cb(new Error('Node is not connected'));

                this.sendRequestReverseConnect(ws.contact, srcContact, cb );

            }catch(err){
                cb(new Error('Invalid contact'));
            }

        }

        sendRendezvousReverseConnection(contact, identity, cb){
            this.send(contact, 'RNDZ_REV_CON', [ identity],  cb);
        }

        send(destContact, command, data, cb){

            if ( this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_ENABLED &&
                !this._alreadyConnected[destContact.identityHex] &&
                 destContact.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS &&
                 destContact.rendezvousContact.contactType === ContactType.CONTACT_TYPE_ENABLED){

                //reverse connection is pending...
                const requestExistsAlready = !!this.pending.list['rendezvous:reverseConnection:' + destContact.identityHex];

                this.pending.pendingAdd(
                    'rendezvous:reverseConnection:'+destContact.identityHex,
                    undefined,
                    () => cb(new Error('Timeout')),
                    () => super.send(destContact, command, data, cb),
                    2 * KAD_OPTIONS.T_RESPONSE_TIMEOUT
                );

                if (requestExistsAlready) return;
                else return this.sendRendezvousReverseConnection( destContact.rendezvousContact, destContact.identity, (err, out) => {

                    if (err) this.pending.pendingTimeoutAll('rendezvous:reverseConnection:'+destContact.identityHex, timeout => timeout() );
                    //already solved... if successful

                }  );

            }

            super.send(destContact, command, data, cb);
        }


    }

}