const ContactType = require('../contact-type/contact-type')
const NextTick = require('../../helpers/next-tick')
const {setAsyncInterval, clearAsyncInterval} = require('../../helpers/async-interval')
const PluginNodeWebsocket = require('../node-websocket/index')

module.exports = function(options){

    return class Rules extends options.Rules{

        constructor() {

            super(...arguments);

            this._rendezvousedJoined = 0;
            this._myRendezvousRelaySocket = null;

            this._commands['RNDZ_JOIN'] = this.rendezvousJoin.bind(this);
            this._commands['UPD_CONTACT'] = this.updateContact.bind(this);

        }

        updateContact(req, srcContact, [contact], cb){
            this._welcomeIfNewNode(req, srcContact);

            if (contact && req.isWebSocket){
                try{
                    contact = this._kademliaNode.createContact(contact);
                    this._welcomeIfNewNode(req, contact);
                }catch(err){

                }
            }

            cb(null, [1]);
        }

        sendUpdateContact(contact, cb){

            const data = [];
            if ( this.webSocketActiveConnectionsByContactsMap[contact.identityHex]  )
                data.push(this._kademliaNode.contact);

            this.send(contact, 'UPD_CONTACT', data, cb)
        }

        async start(opts){

            const out = await super.start(opts);

            this._asyncIntervalSetRendezvous = setAsyncInterval( this._setRendezvousRelayNow.bind(this),  1000 );

            return out;
        }

        stop(){
            super.stop();
            clearAsyncInterval( this._asyncIntervalSetRendezvous );
        }

        _getTimeoutWebSocketTime(ws){
            return (ws.rendezvoused || ws.isMyRendezvousSocket) ? KAD_OPTIONS.PLUGINS.CONTACT_RENDEZVOUS.T_WEBSOCKET_DISCONNECT_RENDEZVOUS : KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_INACTIVITY
        }

        rendezvousJoin(req, srcContact, data, cb){

            if ( !req.isWebSocket ) return cb(new Error('Rendezvous Join is available only for WebSockets') );
            if ( req.rendezvoused ) return cb(new Error(''))

            if (srcContact) this._welcomeIfNewNode(req, srcContact);

            if (this._rendezvousedJoined >= KAD_OPTIONS.PLUGINS.CONTACT_RENDEZVOUS.RENDEZVOUS_JOINED_MAX)
                return cb( new Error('FULL') );

            this._rendezvousedJoined++;
            req.rendezvoused = true;

            req.addEventListener("close", function(event) {
                this._rendezvousedJoined--;
                delete req.rendezvoused;
            });

            this._updateTimeoutWebSocket(req);

            cb(null, [1] );

        }

        sendRendezvousJoin(contact, cb){
            this.send(contact, 'RNDZ_JOIN', [  ],  cb);
        }


        _selectRendezvous(array, cb){

            if (!array) array = this._kademliaNode.routingTable.array;

            let contact, index;

            while (true){

                if (!array.length) return cb(null, null );

                index = Math.floor( Math.random(  ) * array.length )
                contact = array[index].contact;

                array.splice(index, 1);

                if (contact.contactType === ContactType.CONTACT_TYPE_ENABLED)
                    break;

            }

            this._kademliaNode.rules.sendRendezvousJoin(contact, (err, out)=> {

                if (out) return cb(null, contact );
                else NextTick( this._selectRendezvous.bind(this, array, cb) );

            });

        }

        _socketConnectedAsRendezvousSocket(ws){

            ws.isMyRendezvousRelaySocket = true;
            this._myRendezvousRelaySocket = ws;

            ws.addEventListener("close", function(event) {
                this._myRendezvousRelaySocket = null;
            });

            this._updateTimeoutWebSocket(ws);
        }

        _connectRendezvous(contact, cb){

            const address = contact.hostname +':'+ contact.port + contact.path;

            let protocol = contact.convertProtocolToWebSocket(  );
            if (!protocol) return cb(new Error('Protocol is invalid'));

            let ws = this.webSocketActiveConnectionsMap[address];
            if (ws) {
                this._socketConnectedAsRendezvousSocket(ws);
                return cb(null, ws )
            }

            this._createWebSocket(address, contact, protocol,(err, ws) => {

                if (err) return cb(err);
                this._socketConnectedAsRendezvousSocket(ws);
                cb(null, ws);

            });

        }

        _setRendezvousRelay( cb ){

            this._selectRendezvous(undefined, (err, contact )=>{

                if (err) return cb(err);
                if (!contact) return cb(new Error("No Rendezvous"))

                this._connectRendezvous(contact, (err, out)=>{

                    if (err) return cb(err);

                    const rendezvous = contact.toArrayBuffer();

                    if (this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS && this._kademliaNode.contact.rendezvous.equals(rendezvous) )
                        return cb(null, contact);

                    this._kademliaNode.contact.contactType = ContactType.CONTACT_TYPE_RENDEZVOUS;
                    this._kademliaNode.contact.addKey('rendezvous');

                    this._kademliaNode.contact.rendezvous = rendezvous;
                    this._kademliaNode.contact.rendezvousContact = contact;

                    this._kademliaNode.contact.contactUpdated();

                    this._kademliaNode.crawler.contactRefresher.updateContact((err, out)=>{
                        cb(null, contact);
                    })


                })

            })
        }


        _setRendezvousRelayNow( next ){

            if (!this._kademliaNode.contact) return next(1000); //contact was not yet created.
            if (this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_ENABLED) return next(5000);
            if (this._myRendezvousRelaySocket) return next(2500)

            this._setRendezvousRelay( () => next(1000) );

        }

    }

}