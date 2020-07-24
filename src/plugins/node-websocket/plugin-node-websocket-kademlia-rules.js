const ContactAddressProtocolType = require('../../contact/contact-address-protocol-type')
const IsomorphicWebSocket = require('isomorphic-ws')
const Contact = require('../../contact/contact')
const bencode = require('bencode');
const BufferHelper = require('../../helpers/buffer-utils')
const blobToBuffer = require('blob-to-buffer')

module.exports = function (kademliaRules){

    kademliaRules.webSocketActiveConnections = [];
    kademliaRules.webSocketActiveConnectionsMap = {};

    //Node.js
    if ( typeof BROWSER === "undefined" && kademliaRules._kademliaNode.plugins.hasPlugin('PluginNodeHTTP') ){
        const WebSocketServer = require('./web-socket-server')
        kademliaRules._webSocketServer = new WebSocketServer(kademliaRules._kademliaNode, {
            server: kademliaRules._httpServer.server,
            'Access-Control-Allow-Origin': "*",
        });
    }

    kademliaRules.createWebSocket = createWebSocket;
    kademliaRules.sendWebSocketWaitAnswer = sendWebSocketWaitAnswer;
    kademliaRules.initializeWebSocket = initializeWebSocket;

    function createWebSocket(address, srcContact ) {

        const data = bencode.encode(this._kademliaNode.contact.toArray()).toString('hex');

        const ws = new IsomorphicWebSocket(address, data);
        ws._kadInitialized = true;
        ws._queue = [];
        ws.contact = srcContact;

        return ws;

    }

    function initializeWebSocket( srcContact, ws) {

        const protocol = ( srcContact.address.protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_SECURED_WEBSOCKET) ? 'wss' : 'ws';
        const address = protocol + '://' + srcContact.address.hostname +':'+ srcContact.address.port + srcContact.address.path;

        //already connected to this node
        if (ws && this.webSocketActiveConnectionsMap[address]){

            if (this.webSocketActiveConnectionsMap[address] !== ws)
                ws.close();

            return undefined;
        }

        if (!ws && this.webSocketActiveConnectionsMap[address]){
            ws = this.webSocketActiveConnectionsMap[address];
            return ws;
        }

        if (!ws)
            ws = this.createWebSocket(address, srcContact);

        ws.id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
        ws.address = address;
        ws.socketsQueue = {};

        this.webSocketActiveConnectionsMap[address] = ws;
        this.webSocketActiveConnections.push(ws);

        ws.onopen = () => {

            if (ws._queue.length) {
                const copy = [...ws._queue];
                ws._queue = [];
                for (const data of copy)
                    this.sendWebSocketWaitAnswer(ws, data.id, data.buffer, data.cb);
            }

        }
        ws.onclose = () => {

            if (this.webSocketActiveConnectionsMap[ws.address] === ws) {
                for (let i = 0; i < this.webSocketActiveConnections.length; i++)
                    if (this.webSocketActiveConnections[i] === ws) {
                        this.webSocketActiveConnections.splice(i, 1);
                        break;
                    }

                for (const id in ws.socketsQueue) {
                    ws.socketsQueue[id].resolve(new Error('Disconnected'));
                    delete this._pending['ws'+ws.id+':'+id];
                }

                ws.socketsQueue = {};

                delete this.webSocketActiveConnectionsMap[ws.address];
            }

        }

        ws.onmessage =  (data) => {

            if (data.type !== "message") return;
            const message = data.data;

            if (typeof Blob !== 'undefined' && message instanceof Blob){
                blobToBuffer(message, (err, buffer)=>{
                    if (err) throw err;

                    processWebSocketMessage.call(this, ws, buffer);
                })
            }else
                processWebSocketMessage.call(this, ws, message );


        };

        return ws;
    }

    function processWebSocketMessage(ws, message){

        const decoded = bencode.decode(message);
        const status = decoded[0];
        const id = decoded[1];

        if ( status === 1 ){ //received an answer

            if (ws.socketsQueue[id]){ //in case it was not deleted

                ws.socketsQueue[id].resolve( null, decoded[2] );
                delete ws.socketsQueue[id];
                delete this._pending['ws'+ws.id+':'+id];

            }

        } else {

            this._kademliaNode.rules.receiveSerialized( id, ws.contact, decoded[2], (err, buffer )=>{

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
            };

            this._pending['ws'+ws.id+':'+id] = {
                time: new Date(),
                error: ()=>{
                    cb(new Error('Timeout'));
                    delete ws.socketsQueue[id];
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
            buffer: bencode.encode( BufferHelper.serializeData([ command, data ] ) ),
        }
    }

    function sendSerialized (id, destContact, command, data, cb)  {

        const buffer = bencode.encode( [0, id, data] );

        let ws;

        try{
            ws = this.initializeWebSocket(destContact, undefined );
        }catch(err){
            return cb(err, null);
        }
        this.sendWebSocketWaitAnswer(ws, id, buffer, cb);

    }

    function receiveSerialize (id, srcContact, out ) {
        return bencode.encode( BufferHelper.serializeData([ 1, id, out] ) )
    }

}