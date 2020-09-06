const ContactType = require('../contact-type/contact-type')
const PluginNodeWebsocketConnectionSocket = require('./connection/websocket-connection-socket')

module.exports = class MyWebSocketExtend  {

    constructor() {
        this.PluginNodeWebsocketConnectionSocketClass = PluginNodeWebsocketConnectionSocket;
    }

    initializeWebSocket(kademliaRules, contact, ws){

        if (contact.contactType === ContactType.CONTACT_TYPE_ENABLED ){

            const address = contact.hostname +':'+ contact.port + contact.path;
            //connected twice
            if (kademliaRules._webSocketActiveConnectionsMap[address] || kademliaRules.alreadyConnected[contact.identityHex]){

                try{

                    if (ws.readyState !== 3 && ws.readyState !== 2) //WebSocket.CLOSED
                        ws.close();

                }catch(err){

                }

                throw Error('Already connected');
            }

            ws.address = address;

        }

        const connection = new this.PluginNodeWebsocketConnectionSocketClass(kademliaRules, ws, contact, );
        return connection;

    }

}

