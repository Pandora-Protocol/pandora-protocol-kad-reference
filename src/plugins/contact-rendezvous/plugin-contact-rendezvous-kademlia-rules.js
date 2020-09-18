const ContactType = require('../contact-type/contact-type')
const NextTick = require('../../helpers/next-tick')
const {setAsyncInterval, clearAsyncInterval} = require('../../helpers/async-interval')

const PluginContactRendezvousConnectionSocket = require('./connection/plugin-contact-rendezvous-connection-socket')

module.exports = function(options){

    return class Rules extends options.Rules{

        constructor() {

            super(...arguments);

            this._rendezvousedJoined = 0;
            this._myRendezvousRelaySocket = null;

            this._commands['RNDZ_JOIN'] = this._rendezvousJoin.bind(this);
            this._commands['UPD_CONTACT'] = this._updateContact.bind(this);

            this.PluginNodeWebsocketConnectionSocketClass = PluginContactRendezvousConnectionSocket;

        }

        _updateContact(req, srcContact, [contact]){

            if (contact)
                contact = this._kademliaNode.createContact(contact);

            return [1];
        }

        sendUpdateContact(contact){

            const data = this.alreadyConnected[contact.identityHex] ? [this._kademliaNode.contact] : [];
            return this.send(contact, 'UPD_CONTACT', data)

        }

        async start(opts){

            const out = await super.start(opts);

            this._asyncIntervalSetRendezvous = setAsyncInterval(
                this._setRendezvousRelayNow.bind(this),
                1000
            );

            return out;
        }

        stop(){
            super.stop();
            clearAsyncInterval( this._asyncIntervalSetRendezvous );
        }

        async _rendezvousJoin(req, srcContact, data){

            if ( !req.isWebSocket ) throw 'Rendezvous Join is available only for WebSockets';
            if ( req.rendezvoused ) throw 'Req is not rendezvoused by me';

            if (this._rendezvousedJoined >= KAD_OPTIONS.PLUGINS.CONTACT_RENDEZVOUS.RENDEZVOUS_JOINED_MAX)
                return [0];

            this._rendezvousedJoined++;
            req.rendezvoused = true;

            req.on("closed", function(event) {
                this._rendezvousedJoined--;
                delete req.rendezvoused;
            });

            req._updateTimeout();

            return [1];

        }

        sendRendezvousJoin(contact){
            return this.send(contact, 'RNDZ_JOIN', [  ]);
        }


        async _selectRendezvous(array){

            if (!array) array = this._kademliaNode.routingTable.array;

            let contact, index;

            while (array.length){

                index = Math.floor( Math.random(  ) * array.length )
                contact = array[index].contact;

                array.splice(index, 1);

                if (contact.contactType === ContactType.CONTACT_TYPE_ENABLED) {

                    const out = await this._kademliaNode.rules.sendRendezvousJoin(contact);
                    if (out && out[0] && out[0] === 1) return contact;

                    break;
                }

            }

        }

        async _connectRendezvous(contact){

            const address = contact.hostname +':'+ contact.port + contact.path;

            let protocol = contact.convertProtocolToWebSocket(  );
            if (!protocol) throw 'Protocol is invalid';

            let ws = this._webSocketActiveConnectionsMap[address];
            if (ws) {
                ws.socketConnectedAsRendezvousSocket();
                return ws;
            }

            const newWs = await this._createWebSocket( contact, protocol);

            newWs.socketConnectedAsRendezvousSocket();
            return newWs;

        }

        async _setRendezvousRelay(  ){

            const contact = await this._selectRendezvous();
            if (!contact) return;

            const out = await this._connectRendezvous(contact);
            if ( !out ) return;

            const rendezvous = contact.toArrayBuffer();

            if (this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS && this._kademliaNode.contact.rendezvous.equals(rendezvous) )
                return contact;

            this._kademliaNode.contact.contactType = ContactType.CONTACT_TYPE_RENDEZVOUS;
            this._kademliaNode.contact.rendezvous = rendezvous;

            this._kademliaNode.contact.contactUpdated();

            await this._kademliaNode.crawler.contactRefresher.refreshContact();
            return contact;

        }


        async _setRendezvousRelayNow( ){

            if (!this._kademliaNode.contact) return 1000; //contact was not yet created.
            if (this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_ENABLED) return 5000;
            if (this._myRendezvousRelaySocket) return 2500;

            await this._setRendezvousRelay( );

            return 1000;

        }

    }

}