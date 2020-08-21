const WebSocket = require('isomorphic-ws')
const bencode = require('bencode');
const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')

module.exports = class WebSocketServer extends WebSocket.Server {

    constructor(kademliaNode, options) {

        super(options);

        this._kademliaNode = kademliaNode;

        this.on('connection', this.newClientConnection );

    }

    newClientConnection(ws){

        this._kademliaNode.rules.receiveSerialized( ws, 0, undefined, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET, Buffer.from( ws.protocol, "hex"), {returnNotAllowed: true}, (err, out) =>{

            if (err) return ws.close();

            try{
                ws._kadInitialized = true;

                this._kademliaNode.rules._initializeWebSocket(  out[0], ws, (err, ws)=>{
                    if (err)
                        return ws.close();
                })

            }catch(err){
                return ws.close();
            }


        } );

    }


}