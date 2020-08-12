const ContactType = require('./contact-type')
const NextTick = require('../../helpers/next-tick')
const {setAsyncInterval, clearAsyncInterval} = require('../../helpers/async-interval')
const PluginNodeWebsocket = require('../node-websocket/index')

module.exports = function(options){

    return class Rules extends options.Rules{

        constructor() {
            super(...arguments);

            this._relayedJoined = 0;
            this._relaySocket = null;

            this._commands['RELAY_JOIN'] = this.relayJoin.bind(this);
            this._commands['RELAY_REVERSE_CON'] = this.relayReverseConnection.bind(this);

        }

        async start(opts){

            const out = await super.start(opts);

            this._asyncIntervalSetRelay = await setAsyncInterval( this._setRelayNow.bind(this),  1000 );

            return out;
        }

        stop(){
            super.stop();
            clearAsyncInterval( this._asyncIntervalSetRelay );
        }

        _setTimeoutWebSocket(ws){
            this._pending['ws'+ws.id] = {
                timestamp: new Date().getTime(),
                time: (ws.relayed || ws.isRelaySocket) ? KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_RELAY : KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_INACTIVITY,
                timeout: () => ws.close(),
            }
        }

        relayJoin(req, srcContact, data, cb){

            if (srcContact) this._welcomeIfNewNode(srcContact);

            if (this._relayedJoined >= KAD_OPTIONS.PLUGINS.CONTACT_RELAY.RELAY_JOINED_MAX)
                return cb( new Error('FULL') );

            this._relayedJoined++;
            req.relayed = true;

            cb(null, [1] );

        }

        sendRelayJoin(contact, cb){
            this.send(contact, 'RELAY_JOIN', [  ],  cb);
        }

        relayReverseConnection(req, srcContact, data, cb){

        }

        sendRelayReverseConnection(contact, cb){
            this.send(contact, 'RELAY_REVERSE_CON', [ this._kademliaNode.contact ],  cb);
        }

        _selectRelay(array, cb){

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

            this._kademliaNode.rules.sendRelayJoin(contact, (err, out)=> {

                if (out) return cb(null, contact );
                else NextTick( this._selectRelay.bind(this, array, cb) );

            });

        }

        setRelay( cb ){

            this._selectRelay(undefined, (err, contact )=>{

                if (err) return cb(err);
                if (!contact) return cb(new Error("No relay"))

                this._connectRelay(contact, (err, out)=>{

                    if (err) return cb(err);

                    this._kademliaNode.contact.contactType = ContactType.CONTACT_TYPE_RELAY;
                    this._kademliaNode.contact.addKey('relay');

                    this._kademliaNode.contact.relay = contact.toArrayBuffer();
                    this._kademliaNode.contact.relayContact = contact;

                    this._kademliaNode.contact.contactUpdated();

                    this._kademliaNode.crawler.contactRefresher.updateContact((err, out)=>{
                        cb(null, contact);
                    })


                })

            })
        }

        _socketConnectedAsRelaySocket(ws){

            ws.isRelaySocket = true;
            this._relaySocket = ws;

            ws.onclosed = ()=>{
                this._relaySocket = null;
            }

            delete this._pending['ws'+ws.id];
        }

        _connectRelay(contact, cb){

            const address = contact.hostname +':'+ contact.port + contact.path;

            let protocol = contact.convertProtocolToWebSocket(  );
            if (!protocol) return cb(new Error('Protocol is invalid'));

            let ws = this.webSocketActiveConnectionsMap[address];
            if (ws) {
                this._socketConnectedAsRelaySocket(ws);
                return cb(null, ws )
            }

            this._createWebSocket(address, contact, protocol,(err, ws) => {

                if (err) return cb(err);
                this._socketConnectedAsRelaySocket(ws);
                cb(null, ws);

            });

        }

        _setRelayNow( next ){

            if (this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_ENABLED)
                return next(5000);

            if (this._relaySocket)
                return next(2500)

            this.setRelay( () => next(1000) );

        }

        send(destContact, command, data, cb){

            if (destContact.contactType === ContactType.CONTACT_TYPE_RELAY){

                //reverse connection
                if (this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_ENABLED){

                    if (destContact.relayContact.contactType !== ContactType.CONTACT_TYPE_ENABLED )
                        return cb(new Error("Relay contact type is invalid"));

                    return this.sendRelayReverseConnection( destContact.relayContact, (err, out) => {

                        if (err) return cb(err);

                    }  );

                }

                return cb(new Error("Connecting to this contact can't be done"))
            }

            super.send(destContact, command, data, cb);
        }

    }

}