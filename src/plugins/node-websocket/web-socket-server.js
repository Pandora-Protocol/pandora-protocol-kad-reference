const WebSocket = require('isomorphic-ws')
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
                const contact = this._kademliaNode.createContact( decoded );
                ws._kadInitialized = true;

                this._kademliaNode.rules._initializeWebSocket(  contact, ws, (err, ws)=>{
                    if (err)
                        return ws.close();
                })

            }catch(err){
                return ws.close();
            }


        } );

    }


}