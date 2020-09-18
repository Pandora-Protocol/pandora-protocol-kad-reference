const ContactType = require('../contact-type/contact-type')
const PromisesMap = require('../../helpers/promises-map');

module.exports = function(options) {

    return class Rules extends options.Rules {

        constructor() {

            super(...arguments);

            this._commands['REV_CON'] = this._reverseConnect.bind(this);
            this._commands['REQ_REV_CON'] = this._requestReverseConnect.bind(this);
            this._commands['RNDZ_REV_CON'] = this._rendezvousReverseConnection.bind(this);

        }

        _reverseConnect(req, srcContact, data){

            PromisesMap.resolve('rendezvous:reverseConn:' + srcContact.identityHex, true)
            return [1];

        }

        sendReverseConnect(contact){
            return this.send(contact, 'REV_CON', [] )
        }

        _requestReverseConnect(req, srcContact, [contact] ){

            try{

                contact = this._kademliaNode.createContact( contact );

            }catch(err){
                return [];
            }

            return this.sendReverseConnect( contact );
        }

        sendRequestReverseConnect(contact, contactFinal){
            return this.send(contact, 'REQ_REV_CON', [contactFinal])
        }

        _rendezvousReverseConnection(req, srcContact, [identity]){

            let identityHex, connection;

            try{

                identityHex = identity.toString('hex');
                connection = this._webSocketActiveConnectionsByContactsMap[ identityHex ];

                if (!connection) return []
                return this.sendRequestReverseConnect( connection.contact, srcContact );

            }catch(err){
                return [];
            }

        }

        sendRendezvousReverseConnection(contact, identity,){
            return this.send(contact, 'RNDZ_REV_CON', [ identity ],);
        }

        async _sendNow(dstContact, command, data){

            if ( this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_ENABLED &&
                !this.alreadyConnected[dstContact.identityHex] &&
                dstContact.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS &&
                dstContact.rendezvousContact.contactType === ContactType.CONTACT_TYPE_ENABLED){

                //reverse connection is pending...
                let promiseData = PromisesMap.get( 'rendezvous:reverseConn:' + dstContact.identityHex );

                if (promiseData) {
                    await promiseData.promise;
                    return super._sendNow(dstContact, command, data);
                }

                promiseData = PromisesMap.add('rendezvous:reverseConn:' + dstContact.identityHex, KAD_OPTIONS.T_RESPONSE_TIMEOUT);

                try{
                    const out = await this.sendRendezvousReverseConnection( dstContact.rendezvousContact, dstContact.identity);
                    if (!out || !out.length) throw 'Invalid';
                }catch(err){
                    PromisesMap.reject('rendezvous:reverseConn:' + dstContact.identityHex);
                }

                await promiseData.promise;
                return super._sendNow(dstContact, command, data);

            }

            return super._sendNow(dstContact, command, data);
        }


    }

}