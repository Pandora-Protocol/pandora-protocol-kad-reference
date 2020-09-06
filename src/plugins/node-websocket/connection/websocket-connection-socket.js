const PluginNodeWebsocketConnectionBasic = require('./connection-basic')
const ContactAddressProtocolType = require('../../contact-type/contact-address-protocol-type')
const ContactConnectedStatus = require('../../../contact/contact-connected-status')

module.exports = class WebSocketConnectionSocket extends PluginNodeWebsocketConnectionBasic {

    constructor(kademliaRules, connection, contact) {

        super(kademliaRules, connection, contact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET, 'ws');

        this.isWebSocket = true;
        kademliaRules._webSocketActiveConnectionsByContactsMap[contact.identityHex] = this;
        kademliaRules.alreadyConnected[contact.identityHex] = this;
        kademliaRules._webSocketActiveConnections.push(this);

        connection.onopen = this.onopen.bind(this);
        connection.onerror =  connection.onclose = this.onclose.bind(this);
        connection.onmessage = this.onmessage.bind(this);

        if (connection.readyState === 1) { //OPEN
            this.status = ContactConnectedStatus.CONTACT_OPEN;
            this._updateTimeout();
        }
        else
            this.status = ContactConnectedStatus.CONTACT_CLOSED;

        kademliaRules._webSocketActiveConnectionsMap[connection.address] = this;

    }

    close(){
        try{
            this._connection.close();
        }catch(err){

        }
    }

    onclose(){

        super.onclose(...arguments)

        if (this._kademliaRules._webSocketActiveConnectionsByContactsMap[this.contact.identityHex] === this)
            delete this._kademliaRules._webSocketActiveConnectionsByContactsMap[this.contact.identityHex];

        for (let i = 0; i < this._kademliaRules._webSocketActiveConnections.length; i++)
            if (this._kademliaRules._webSocketActiveConnections[i] === this) {
                this._kademliaRules._webSocketActiveConnections.splice(i, 1);
                break;
            }

        if (this.address && this._kademliaRules._webSocketActiveConnectionsMap[this.address] === this)
            delete this._kademliaRules._webSocketActiveConnectionsMap[this.address];

    }


    sendData(id, buffer){
        this._connection.send(buffer);
    }

}