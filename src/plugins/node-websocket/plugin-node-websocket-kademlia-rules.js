const ContactAddressProtocolType = require('../../contact/contact-address-protocol-type')
const IsomorphicWebSocket = require('isomorphic-ws')
const bencode = require('bencode');
const BufferHelper = require('../../helpers/buffer-utils')
const blobToBuffer = require('blob-to-buffer')

module.exports = function (kademliaRules){

    kademliaRules.webSocketActiveConnections = [];
    kademliaRules.webSocketActiveConnectionsMap = {};

    kademliaRules.createWebSocket = createWebSocket;
    kademliaRules.sendWebSocketWaitAnswer = sendWebSocketWaitAnswer;
    kademliaRules.initializeWebSocket = initializeWebSocket;

    const _start = kademliaRules.start.bind(kademliaRules);
    kademliaRules.start = start;

    const _stop = kademliaRules.stop.bind(kademliaRules);
    kademliaRules.stop = stop;

    async function start(opts){

        const out = await _start(opts);

        //Node.js
        if ( typeof BROWSER === "undefined" && kademliaRules._kademliaNode.plugins.hasPlugin('PluginNodeHTTP') ){
            const WebSocketServer = require('./web-socket-server')
            kademliaRules._webSocketServer = new WebSocketServer(kademliaRules._kademliaNode, {
                server: kademliaRules._httpServer.server,
                'Access-Control-Allow-Origin': "*",
            });
        }

        return out;
    }

    function stop(){
        return _stop(...arguments);
    }

    function createWebSocket( address, dstContact, cb ) {

        const data = this._kademliaNode.contact.toArray();
        kademliaRules._sendProcess(dstContact, '', data , (err, data) =>{

            if (err) return cb(err);

            const ws = new IsomorphicWebSocket(address, data.toString('hex') );
            ws._kadInitialized = true;
            ws.contact = dstContact;

            cb(null, ws);
        } );

    }

    function initializeWebSocket( contact, ws, cb ) {

        const protocol = ( contact.address.protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_SECURED_WEBSOCKET) ? 'wss' : 'ws';
        const address = protocol + '://' + contact.address.hostname +':'+ contact.address.port + contact.address.path;

        //connected twice
        if (ws && this.webSocketActiveConnectionsMap[address]){

            if (this.webSocketActiveConnectionsMap[address] !== ws)
                ws.close();

            return cb(new Error('Already connected'));
        }

        //connected once already already
        if (!ws && this.webSocketActiveConnectionsMap[address]){
            return cb(null, this.webSocketActiveConnectionsMap[address] );
        }

        if (!ws)
            return this.createWebSocket(address, contact, (err, ws) => {
                if (err) return cb(err);
                this.initializeWebSocket(contact, ws, cb);
            });

        ws.id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
        ws.address = address;
        ws.socketsQueue = {};
        ws._queue = [];

        this.webSocketActiveConnectionsMap[address] = ws;
        this.webSocketActiveConnections.push(ws);

        this._pending['ws'+ws.id] = {
            timestamp: new Date().getTime(),
            time: KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_INACTIVITY,
            timeout: () =>  ws.close(),
        }

        ws.onopen = () => {

            this._pending['ws'+ws.id].timestamp = new Date().getTime()

            if (ws._queue.length) {
                const copy = [...ws._queue];
                ws._queue = [];
                for (const data of copy)
                    this.sendWebSocketWaitAnswer(ws, data.id, data.buffer, data.cb);
            }

        }

        ws.onerror =
        ws.onclose = () => {

            if (this.webSocketActiveConnectionsMap[ws.address] === ws) {

                for (let i = 0; i < this.webSocketActiveConnections.length; i++)
                    if (this.webSocketActiveConnections[i] === ws) {
                        this.webSocketActiveConnections.splice(i, 1);
                        break;
                    }
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

            }

        }

        ws.onmessage =  (data) => {

            if (data.type !== "message") return;

            if (this._pending['ws'+ws.id])
                this._pending['ws'+ws.id].timestamp = new Date().getTime()

            const message = data.data;

            if (typeof Blob !== 'undefined' && message instanceof Blob){
                blobToBuffer(message, (err, buffer)=>{
                    if (err) throw err;

                    processWebSocketMessage.call(this, ws, buffer);
                })
            }else
                processWebSocketMessage.call(this, ws, message );


        };

        cb(null, ws);
    }

    function processWebSocketMessage(ws, message){

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

            this._kademliaNode.rules.receiveSerialized( id, ws.contact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET, decoded[2], (err, buffer )=>{

                if (err) return;

                ws.send(buffer);

            });

        }

    }

    function sendWebSocketWaitAnswer(ws, id, buffer, cb){

        if (ws.readyState !== 1)
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




    if (ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET === undefined) throw new Error('WebSocket protocol was not initialized.');
    kademliaRules._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET] =
    kademliaRules._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_SECURED_WEBSOCKET] = {
        sendSerialize: sendSerialize.bind(kademliaRules),
        sendSerialized: sendSerialized.bind(kademliaRules),
        receiveSerialize: receiveSerialize.bind(kademliaRules),
    }


    function sendSerialize (destContact, command, data) {
        const id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
        return {
            id,
            out: [ command, data ],
        }
    }

    function sendSerialized (id, destContact, protocol, command, data, cb)  {

        const buffer = bencode.encode( [0, id, data] );

        this.initializeWebSocket(destContact, undefined, (err, ws) =>{

            if (err) return cb(err);
            if (!ws) return cb( new Error("Couldn't create web socket"), null);

            this.sendWebSocketWaitAnswer(ws, id, buffer, cb);

        } );

    }

    function receiveSerialize (id, srcContact, out ) {
        return bencode.encode( BufferHelper.serializeData([ 1, id, out] ) )
    }

}