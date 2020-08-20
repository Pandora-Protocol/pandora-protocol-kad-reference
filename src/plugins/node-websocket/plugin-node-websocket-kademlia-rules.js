const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const IsomorphicWebSocket = require('isomorphic-ws')
const bencode = require('bencode');
const BufferHelper = require('../../helpers/buffer-utils')
const blobToBuffer = require('blob-to-buffer')
const ContactType = require('../contact-type/contact-type')
const WebSocketServer = typeof BROWSER === "undefined" ? require('./web-socket-server') : undefined;

module.exports = function (options){

    return class MyRules extends options.Rules{

        constructor() {
            super(...arguments);

            this._webSocketActiveConnections = [];
            this._webSocketActiveConnectionsMap = {};
            this._webSocketActiveConnectionsByContactsMap = {};

            if (ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET === undefined) throw new Error('WebSocket protocol was not initialized.');
            this._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET] =
            this._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_SECURED_WEBSOCKET] = {
                sendSerialize: this._websocketSendSerialize.bind(this),
                sendSerialized: this._websocketSendSerialized.bind(this),
                receiveSerialize: this._websocketReceiveSerialize.bind(this),
            }

        }


        async start(opts){

            const out = await super.start(opts);

            //Node.js
            if ( typeof BROWSER === "undefined" && this._kademliaNode.plugins.hasPlugin('PluginNodeHTTP') )
                this._webSocketServer = new WebSocketServer(this._kademliaNode, {
                    server: this._httpServer.server,
                    'Access-Control-Allow-Origin': "*",
                });


            return out;
        }

        stop(){
            return super.stop(...arguments);
        }

        _createWebSocket( address, dstContact, protocol, cb ) {

            const data = this._kademliaNode.contact.toArray();
            this._sendProcess(dstContact, protocol, data, {forceEncryption: true}, (err, data) =>{

                if (err) return cb(err);

                if (protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET) address = 'ws://'+address;
                else if (protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_SECURED_WEBSOCKET) address = 'wss://'+address;
                else return cb(new Error('invalid protocol type'));

                const ws = new IsomorphicWebSocket(address, data.toString('hex') );
                ws._kadInitialized = true;

                this._initializeWebSocket(dstContact, ws, cb);

            } );

        }

        _getTimeoutWebSocketTime(ws){
            return KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_INACTIVITY
        }

        _setTimeoutWebSocket(ws){
            this.pending.pendingAdd( 'ws:'+ws.id, '',() => ws.close(), ()=>{}, this._getTimeoutWebSocketTime(ws),  );
        }


        _updateTimeoutWebSocket(ws){
            const pending = this.pending.list['ws:'+ws.id];
            if (pending) {
                pending[''].timestamp = new Date().getTime();
                pending[''].time = this._getTimeoutWebSocketTime(ws);
            }
            else
                this._setTimeoutWebSocket(ws);
        }

        _initializeWebSocket( contact, ws, cb ) {

            if (contact.contactType === ContactType.CONTACT_TYPE_ENABLED ){

                const address = contact.hostname +':'+ contact.port + contact.path;
                //connected twice
                if (this._webSocketActiveConnectionsMap[address] || this._alreadyConnected[contact.identityHex]){

                    try{

                        if (ws.readyState !== 3 && ws.readyState !== 2) //WebSocket.CLOSED
                            ws.close();

                    }catch(err){

                    }

                    return cb(new Error('Already connected'));
                }

                ws.address = address;
                this._webSocketActiveConnectionsMap[address] = ws;

            }



            ws.contact = contact;
            ws.contactProtocol  = ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;
            ws.isWebSocket = true;

            ws.id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
            ws.socketPending = {};
            ws._queue = [];

            this._webSocketActiveConnectionsByContactsMap[contact.identityHex] = ws;
            this._alreadyConnected[contact.identityHex] = ws;
            this._webSocketActiveConnections.push(ws);

            this._updateTimeoutWebSocket(ws);

            ws.onopen = () => {

                if (ws._queue.length) {
                    const copy = [...ws._queue];
                    ws._queue = [];
                    for (const data of copy)
                        this._sendWebSocketWaitAnswer(ws, data.id, data.buffer, data.cb);
                }

            }

            ws.onerror =
                ws.onclose = () => {

                    if (this._webSocketActiveConnectionsByContactsMap[contact.identityHex] === ws)
                        delete this._webSocketActiveConnectionsByContactsMap[contact.identityHex];

                    if (this._alreadyConnected[contact.identityHex] === ws)
                        delete this._alreadyConnected[contact.identityHex];

                    for (let i = 0; i < this._webSocketActiveConnections.length; i++)
                        if (this._webSocketActiveConnections[i] === ws) {
                            this._webSocketActiveConnections.splice(i, 1);
                            break;
                        }

                    if (ws.address && this._webSocketActiveConnectionsMap[ws.address] === ws)
                        delete this._webSocketActiveConnectionsMap[ws.address];

                    this.pending.pendingTimeoutAll('ws:'+ws.id, timeout => timeout() );

                    if (ws._queue.length) {
                        for (const data of  ws._queue)
                            data.cb(new Error('Disconnected or Error'))
                        ws._queue = [];
                    }

                }

            ws.onmessage = (data) => {

                if (data.type !== "message") return;

                this._updateTimeoutWebSocket(ws);

                const message = data.data;

                if (typeof Blob !== 'undefined' && message instanceof Blob){
                    blobToBuffer(message, (err, buffer)=>{
                        if (err) return err;

                        this.processWebSocketMessage( ws, buffer);
                    })
                }else
                    this.processWebSocketMessage( ws, message );


            };

            cb(null, ws);
        }

        processWebSocketMessage(ws, message){

            const decoded = bencode.decode(message);
            const status = decoded[0];
            const id = decoded[1];

            if ( status === 1 ){ //received an answer

                if (this.pending.list['ws:'+ws.id] && this.pending.list['ws:'+ws.id][id])
                    this.pending.pendingResolve('ws:'+ws.id, id, (resolve) => resolve( null, decoded[2] ));

            } else {

                this.receiveSerialized( ws, id, ws.contact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET, decoded[2], {}, (err, buffer )=>{

                    if (err) return;
                    ws.send(buffer);

                });

            }

        }

        _sendWebSocketWaitAnswer(ws, id, buffer, cb){

            if (ws.readyState !== 1 ) //WebSocket.OPEN
                ws._queue.push( {id, buffer, cb} );
            else {

                this.pending.pendingAdd('ws:'+ws.id, id, undefined, cb);
                ws.send( buffer )
                
            }

        }


        _websocketSendSerialize (destContact, command, data) {
            const id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
            return {
                id,
                out: [ command, data ],
            }
        }

        _websocketSendSerialized (id, destContact, protocol, command, data, cb)  {

            const buffer = bencode.encode( [0, id, data] );

            //connected once already already
            if (this._webSocketActiveConnectionsByContactsMap[destContact.identityHex])
                return this._sendWebSocketWaitAnswer( this._webSocketActiveConnectionsByContactsMap[destContact.identityHex], id, buffer, cb);

            const address = destContact.hostname +':'+ destContact.port + destContact.path;
            this._createWebSocket(address, destContact, protocol,(err, ws) => {
                if (err) return cb(err);
                this._sendWebSocketWaitAnswer(ws, id, buffer, cb);
            });

        }

        _websocketReceiveSerialize (id, srcContact, out ) {
            return bencode.encode( BufferHelper.serializeData([ 1, id, out] ) )
        }


    }


}