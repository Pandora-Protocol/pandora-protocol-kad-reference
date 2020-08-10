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

        this._kademliaNode.rules._receivedProcess( null,'', Buffer.from( ws.protocol, "hex"), (err, out) =>{

            if (err)
                return ws.close();

            try{
                const decoded = bencode.decode( out );
                const contact = Contact.fromArray(this._kademliaNode, decoded);
                ws._kadInitialized = true;
                ws.contact = contact;

                this._kademliaNode.rules._initializeWebSocket(  ws.contact, ws, (err, ws)=>{
                    if (err)
                        return ws.close();
                })

            }catch(err){
                return ws.close();
            }


        } );

    }


}