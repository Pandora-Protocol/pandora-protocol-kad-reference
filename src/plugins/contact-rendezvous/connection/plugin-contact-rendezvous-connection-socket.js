const WebSocketConnectionSocket = require('../../node-websocket/connection/websocket-connection-socket')

module.exports = class WebSocketContactRendezvousConnectionSocket extends WebSocketConnectionSocket {

    _getTimeoutWebSocketTime(){
        return (this.rendezvoused || this.isMyRendezvousRelaySocket) ? KAD_OPTIONS.PLUGINS.CONTACT_RENDEZVOUS.T_WEBSOCKET_DISCONNECT_RENDEZVOUS : KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_INACTIVITY
    }

    socketConnectedAsRendezvousSocket(){

        this.isMyRendezvousRelaySocket = true;
        this._kademliaRules._myRendezvousRelaySocket = this;

        this.on("close", function(event) {
            this._kademliaRules._myRendezvousRelaySocket = null;
        });

        this._updateTimeout();
    }

}