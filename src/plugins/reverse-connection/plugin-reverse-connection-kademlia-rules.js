const ContactType = require('../contact-type/contact-type')

module.exports = function(options) {

    return class Rules extends options.Rules {

        constructor() {

            super(...arguments);

            this._commands['REV_CON'] = this.reverseConnect.bind(this);
            this._commands['REQ_REV_CON'] = this.requestReverseConnect.bind(this);
            this._commands['RNDZ_REV_CON'] = this.rendezvousReverseConnection.bind(this);

        }

        reverseConnect(req, srcContact, data, cb){

            this._pendingResolveAll('rendezvous:' + srcContact.identityHex, (resolve) => resolve(null, true ));
            cb(null, 1);

        }

        sendReverseConnect(contact, cb){
            this.send(contact, 'REV_CON', [], cb)
        }

        requestReverseConnect(req, srcContact, [contact], cb ){

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

        rendezvousReverseConnection(req, srcContact, [identity], cb){

            try{

                const identityHex = identity.toString('hex');
                const ws = this.webSocketActiveConnectionsByContactsMap[ identityHex ];
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

            if ( !this.webSocketActiveConnectionsByContactsMap[destContact.identityHex] && destContact.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS){

                //reverse connection
                if (this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_ENABLED) {

                    //reverse connection is pending...
                    let exists = false;
                    if (this._pending['rendezvous:' + destContact.identityHex])
                        exists = true;

                    if (destContact.rendezvousContact.contactType !== ContactType.CONTACT_TYPE_ENABLED )
                        return cb(new Error("RendezvousContact type is invalid"));

                    this._pendingAdd('rendezvous:'+destContact.identityHex, ()=> cb(new Error('Timeout')), (out) => super.send(destContact, command, data, cb), 2 * KAD_OPTIONS.T_RESPONSE_TIMEOUT);

                    if (exists) return;
                    else return this.sendRendezvousReverseConnection( destContact.rendezvousContact, destContact.identity, (err, out) => {

                        if (err && this._pending['rendezvous:'+destContact.identityHex])
                            this._pendingTimeoutAll('rendezvous:'+destContact.identityHex, err);

                    }  );

                }

                return cb(new Error("Connecting to this contact can't be done"))
            }

            super.send(destContact, command, data, cb);
        }


    }

}