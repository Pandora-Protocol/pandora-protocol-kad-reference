const blobToBuffer = require('blob-to-buffer')
const ContactType = require('../contact-type/contact-type')
const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const bencode = require('bencode');

module.exports = function (WebSocketExtend) {

    return class MyWebSocketExtend extends WebSocketExtend {

        initializeWebSocket(kademliaRules, contact, ws, cb){

            if (contact.contactType === ContactType.CONTACT_TYPE_ENABLED ){

                const address = contact.hostname +':'+ contact.port + contact.path;
                //connected twice
                if (kademliaRules._webSocketActiveConnectionsMap[address] || kademliaRules._alreadyConnected[contact.identityHex]){

                    try{

                        if (ws.readyState !== 3 && ws.readyState !== 2) //WebSocket.CLOSED
                            ws.close();

                    }catch(err){

                    }

                    return cb(new Error('Already connected'));
                }

                ws.address = address;
                kademliaRules._webSocketActiveConnectionsMap[address] = ws;

            }

            ws.contact = contact;
            ws.contactProtocol  = ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;
            ws.isWebSocket = true;

            ws.id = contact.identityHex;
            ws._queue = [];

            ws._kademliaRules = kademliaRules;

            kademliaRules._webSocketActiveConnectionsByContactsMap[contact.identityHex] = ws;
            kademliaRules._alreadyConnected[contact.identityHex] = ws;
            kademliaRules._webSocketActiveConnections.push(ws);

            this._extendWebSocket(ws);

            ws._updateTimeoutWebSocket();

            cb(null, ws);

        }

        _extendWebSocket(ws){
            ws.onopen = this.onopen.bind(ws);
            ws.onerror =  ws.onclose = this.onclose.bind(ws);
            ws.onmessage = this.onmessage.bind(ws);
            ws.processWebSocketMessage = this.processWebSocketMessage.bind(ws);
            ws._getTimeoutWebSocketTime = this._getTimeoutWebSocketTime.bind(ws);
            ws._setTimeoutWebSocket = this._setTimeoutWebSocket.bind(ws);
            ws._updateTimeoutWebSocket = this._updateTimeoutWebSocket.bind(ws);
            ws.sendWebSocketWaitAnswer = this.sendWebSocketWaitAnswer.bind(ws);
        }

        onopen() {

            if (this._queue.length) {
                const copy = [...this._queue];
                this._queue = [];
                for (const data of copy)
                    this.sendWebSocketWaitAnswer( data.id, data.buffer, data.cb);
            }

        }

        onclose () {

            if (this._kademliaRules._webSocketActiveConnectionsByContactsMap[this.contact.identityHex] === this)
                delete this._kademliaRules._webSocketActiveConnectionsByContactsMap[this.contact.identityHex];

            if (this._kademliaRules._alreadyConnected[this.contact.identityHex] === this)
                delete this._kademliaRules._alreadyConnected[this.contact.identityHex];

            for (let i = 0; i < this._kademliaRules._webSocketActiveConnections.length; i++)
                if (this._kademliaRules._webSocketActiveConnections[i] === this) {
                    this._kademliaRules._webSocketActiveConnections.splice(i, 1);
                    break;
                }

            if (this.address && this._kademliaRules._webSocketActiveConnectionsMap[this.address] === this)
                delete this._kademliaRules._webSocketActiveConnectionsMap[this.address];

            this._kademliaRules.pending.pendingTimeoutAll('ws:'+this.id, timeout => timeout() );

            if (this._queue.length) {
                for (const data of this._queue)
                    data.cb(new Error('Disconnected or Error'))
                this._queue = [];
            }

        }


        onmessage (data) {

            if (data.type !== "message") return;

            this._updateTimeoutWebSocket();

            const message = data.data;

            if (typeof Blob !== 'undefined' && message instanceof Blob){
                blobToBuffer(message, (err, buffer)=>{
                    if (err) return err;

                    this.processWebSocketMessage( buffer);
                })
            }else
                this.processWebSocketMessage( message );


        };

        processWebSocketMessage  ( message) {

            const decoded = bencode.decode(message);
            const status = decoded[0];
            const id = decoded[1];

            if ( status === 1 ){ //received an answer

                if (this._kademliaRules.pending.list['ws:'+this.id] && this._kademliaRules.pending.list['ws:'+this.id][id])
                    this._kademliaRules.pending.pendingResolve('ws:'+this.id, id, (resolve) => resolve( null, decoded[2] ));

            } else {

                this._kademliaRules.receiveSerialized( this, id, this.contact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET, decoded[2], {}, (err, buffer )=>{

                    if (err) return;
                    this.send(buffer);

                });

            }

        }

        _getTimeoutWebSocketTime () {
            return KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_INACTIVITY
        }

        _setTimeoutWebSocket () {
            this._kademliaRules.pending.pendingAdd( 'ws:'+this.id, '',() => {
                try{
                    this.close();
                }catch(err){

                }
                this.onclose();
            }, ()=>{}, this._getTimeoutWebSocketTime(),  );
        }

        _updateTimeoutWebSocket () {
            const pending = this._kademliaRules.pending.list['ws:'+this.id];
            if (pending && pending['']) {
                pending[''].timestamp = new Date().getTime();
                pending[''].time = this._getTimeoutWebSocketTime();
            }
            else
                this._setTimeoutWebSocket();
        }

        sendWebSocketWaitAnswer ( id, buffer, cb)  {

            if (this.readyState !== 1 ) //WebSocket.OPEN
                this._queue.push( {id, buffer, cb} );
            else {

                this._kademliaRules.pending.pendingAdd('ws:'+this.id, id, ()=> cb(new Error('Timeout')), cb);
                this.send( buffer )

            }

        }


    }

}

