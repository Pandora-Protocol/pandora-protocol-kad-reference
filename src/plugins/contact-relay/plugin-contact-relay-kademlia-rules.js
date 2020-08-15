const ContactType = require('../contact-type/contact-type')
const NextTick = require('../../helpers/next-tick')
const {setAsyncInterval, clearAsyncInterval} = require('../../helpers/async-interval')
const PluginNodeWebsocket = require('../node-websocket/index')

module.exports = function(options){

    return class Rules extends options.Rules{

        constructor() {
            super(...arguments);

            this._relayedJoined = 0;
            this._relaySocket = null;

            this._commands['REV_CON'] = this.reverseConnect.bind(this);
            this._commands['REQ_REV_CON'] = this.requestReverseConnect.bind(this);
            this._commands['RELAY_JOIN'] = this.relayJoin.bind(this);
            this._commands['RELAY_REV_CON'] = this.relayReverseConnection.bind(this);

        }



        async start(opts){

            const out = await super.start(opts);

            this._asyncIntervalSetRelay = setAsyncInterval( this._setRelayNow.bind(this),  1000 );

            return out;
        }

        stop(){
            super.stop();
            clearAsyncInterval( this._asyncIntervalSetRelay );
        }

        _getTimeoutWebSocketTime(ws){
            return (ws.relayed || ws.isRelaySocket) ? KAD_OPTIONS.PLUGINS.CONTACT_RELAY.T_WEBSOCKET_DISCONNECT_RELAY : KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_INACTIVITY
        }



        reverseConnect(req, srcContact, data, cb){

            const pending = this._pending['relay:' + srcContact.identityHex];
            if (pending) {
                delete this._pending['relay:' + srcContact.identityHex];
                pending.resolve(null, true);
            }

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

        relayJoin(req, srcContact, data, cb){

            if ( !req.isWebSocket ) return cb(new Error('Relay Join is available only for WebSockets') );
            if ( req.relayed ) return cb(new Error(''))

            if (srcContact) this._welcomeIfNewNode(req, srcContact);

            if (this._relayedJoined >= KAD_OPTIONS.PLUGINS.CONTACT_RELAY.RELAY_JOINED_MAX)
                return cb( new Error('FULL') );

            this._relayedJoined++;
            req.relayed = true;
            this._updateTimeoutWebSocket(req);

            cb(null, [1] );

        }

        sendRelayJoin(contact, cb){
            this.send(contact, 'RELAY_JOIN', [  ],  cb);
        }

        relayReverseConnection(req, srcContact, [identity], cb){

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

        sendRelayReverseConnection(contact, identity, cb){
            this.send(contact, 'RELAY_REV_CON', [ identity],  cb);
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

                    const relay = contact.toArrayBuffer();

                    if (this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_RELAY && this._kademliaNode.contact.relay.equals(relay) )
                        return cb(null, contact);

                    this._kademliaNode.contact.contactType = ContactType.CONTACT_TYPE_RELAY;
                    this._kademliaNode.contact.addKey('relay');

                    this._kademliaNode.contact.relay = relay;
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

            this._updateTimeoutWebSocket(ws);
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

            if (!this._kademliaNode.contact) return next(1000); //contact was not yet created.

            if (this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_ENABLED)
                return next(5000);

            if (this._relaySocket)
                return next(2500)

            this.setRelay( () => next(1000) );

        }

        send(destContact, command, data, cb){

            if ( !this.webSocketActiveConnectionsByContactsMap[destContact.identityHex] && destContact.contactType === ContactType.CONTACT_TYPE_RELAY){

                //reverse connection
                if (this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_ENABLED){

                    if (destContact.relayContact.contactType !== ContactType.CONTACT_TYPE_ENABLED )
                        return cb(new Error("Relay contact type is invalid"));

                    this._pending['relay:'+destContact.identityHex] = {
                        timestamp: new Date().getTime(),
                        timeout: ()=> cb(new Error('Timeout')),
                        time: 2 * KAD_OPTIONS.T_RESPONSE_TIMEOUT,
                        resolve: (out) => super.send(destContact, command, data, cb),
                    }

                    return this.sendRelayReverseConnection( destContact.relayContact, destContact.identity, (err, out) => {

                        if (err && this._pending['relay:'+destContact.identityHex]) {
                            delete this._pending['relay:'+destContact.identityHex];
                            return cb(err);
                        }

                    }  );

                }

                return cb(new Error("Connecting to this contact can't be done"))
            }

            super.send(destContact, command, data, cb);
        }

    }

}