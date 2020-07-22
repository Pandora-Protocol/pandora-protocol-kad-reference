const WebSocket = require('isomorphic-ws')
const Contact = require('../../contact/contact')
const bencode = require('bencode');

module.exports = class WebSocketServer extends WebSocket.Server {

    constructor(kademliaNode, options) {
        super(options);
        this._kademliaNode = kademliaNode;

        this.on('connection', this.newClientConnection );

    }

    newClientConnection(ws){

        try{
            const decoded = bencode.decode( Buffer.from( ws.protocol, "base64") );
            const contact = Contact.fromArray(this._kademliaNode, decoded);
            ws._kadInitialized = true;
            ws.contact = contact;
        }catch(err) {
            return ws.close();
        }

        this._kademliaNode.rules.initializeWebSocket(  ws.contact, ws)

    }


}