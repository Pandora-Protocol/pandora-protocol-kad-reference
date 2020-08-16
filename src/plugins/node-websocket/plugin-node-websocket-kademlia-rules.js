const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const IsomorphicWebSocket = require('isomorphic-ws')
const bencode = require('bencode');
const BufferHelper = require('../../helpers/buffer-utils')
const blobToBuffer = require('blob-to-buffer')
const ContactType = require('../contact-type/contact-type')

module.exports = function (options){

    return class MyRules extends options.Rules{

        constructor() {
            super(...arguments);

            this.webSocketActiveConnections = [];
            this.webSocketActiveConnectionsMap = {};
            this.webSocketActiveConnectionsByContactsMap = {};

            if (ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET === undefined) throw new Error('WebSocket protocol was not initialized.');
            this._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET] =
            this._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_SECURED_WEBSOCKET] = {
                sendSerialize: this._websocketSendSerialize.bind(this),
                sendSerialized: this._websocketSendSerialized.bind(this),
                receiveSerialize: this._websocketReceiveSerialize.bind(this),
            }

        }


        _sendGetProtocol(destContact){

            // the destContact is already contacted via a websocket
            if (this.webSocketActiveConnectionsByContactsMap[destContact.identityHex])
                return ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;

            return super._sendGetProtocol(...arguments);
        }

        async start(opts){

            const out = await super.start(opts);

            //Node.js
            if ( typeof BROWSER === "undefined" && this._kademliaNode.plugins.hasPlugin('PluginNodeHTTP') ){
                const WebSocketServer = require('./web-socket-server')
                this._webSocketServer = new WebSocketServer(this._kademliaNode, {
                    server: this._httpServer.server,
                    'Access-Control-Allow-Origin': "*",
                });
            }

            return out;
        }

        stop(){
            return super.stop(...arguments);
        }

        _createWebSocket( address, dstContact, protocol, cb ) {

            const data = this._kademliaNode.contact.toArray();
            this._sendProcess(dstContact, '', data , (err, data) =>{

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
            this._pending['ws'+ws.id] = {
                timestamp: new Date().getTime(),
                time: this._getTimeoutWebSocketTime(ws),
                timeout: () => ws.close(),
            }
        }


        _updateTimeoutWebSocket(ws){
            if (this._pending['ws'+ws.id])
                this._pending['ws'+ws.id].time = this._getTimeoutWebSocketTime(ws);
            else
                this._setTimeoutWebSocket(ws);
        }

        _initializeWebSocket( contact, ws, cb ) {

            if (contact.contactType === ContactType.CONTACT_TYPE_ENABLED ){

                const address = contact.hostname +':'+ contact.port + contact.path;
                //connected twice
                if (this.webSocketActiveConnectionsMap[address] || this.webSocketActiveConnectionsByContactsMap[contact.identityHex]){

                    try{

                        if (ws.readyState !== 3 && ws.readyState !== 2) //WebSocket.CLOSED
                            ws.close();

                    }catch(err){

                    }

                    return cb(new Error('Already connected'));
                }

                ws.address = address;
                this.webSocketActiveConnectionsMap[address] = ws;

            }



            ws.contact = contact;
            ws.isWebSocket = true;
            ws.id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
            ws.socketsQueue = {};
            ws._queue = [];

            this.webSocketActiveConnectionsByContactsMap[contact.identityHex] = ws;
            this.webSocketActiveConnections.push(ws);

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

                    if (this.webSocketActiveConnectionsByContactsMap[contact.identityHex] === ws)
                        delete this.webSocketActiveConnectionsByContactsMap[contact.identityHex];

                    for (let i = 0; i < this.webSocketActiveConnections.length; i++)
                        if (this.webSocketActiveConnections[i] === ws) {
                            this.webSocketActiveConnections.splice(i, 1);
                            break;
                        }

                    if (ws.address && this.webSocketActiveConnectionsMap[ws.address] === ws)
                        delete this.webSocketActiveConnectionsMap[ws.address];

                    for (const id in ws.socketsQueue) {
                        ws.socketsQueue[id].error(new Error('Disconnected or Error'));
                        delete this._pending['ws'+ws.id+':'+id]
                    }

                    ws.socketsQueue = {};

                    if (ws._queue.length) {
                        const copy = [...ws._queue];
                        ws._queue = [];
                        for (const data of copy)
                            data.cb(new Error('Disconnected or Error'))
                    }

                    if (ws.onclosed) ws.onclosed(  )

                }

            ws.onmessage =  (data) => {

                if (data.type !== "message") return;

                this._updateTimeoutWebSocket(ws);

                const message = data.data;

                if (typeof Blob !== 'undefined' && message instanceof Blob){
                    blobToBuffer(message, (err, buffer)=>{
                        if (err) throw err;

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

                if (ws.socketsQueue[id]){ //in case it was not deleted

                    const socketQueue = ws.socketsQueue[id];
                    delete ws.socketsQueue[id];
                    delete this._pending['ws'+ws.id+':'+id];

                    socketQueue.resolve( null, decoded[2] );

                }

            } else {

                this._kademliaNode.rules.receiveSerialized( ws, id, ws.contact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET, decoded[2], (err, buffer )=>{

                    if (err) return;

                    ws.send(buffer);

                });

            }

        }

        _sendWebSocketWaitAnswer(ws, id, buffer, cb){

            if (ws.readyState !== 1 ) //WebSocket.OPEN
                ws._queue.push( {id, buffer, cb} );
            else {

                ws.socketsQueue[id] = {
                    resolve: cb,
                    error: () => cb(new Error('Disconnected or Error')),
                };

                this._pending['ws'+ws.id+':'+id] = {
                    timestamp: new Date().getTime(),
                    timeout: ()=>{
                        delete ws.socketsQueue[id];
                        cb(new Error('Timeout'));
                    },
                    resolve: cb,
                }

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
            if (this.webSocketActiveConnectionsByContactsMap[destContact.identityHex])
                return this._sendWebSocketWaitAnswer( this.webSocketActiveConnectionsByContactsMap[destContact.identityHex], id, buffer, cb);

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