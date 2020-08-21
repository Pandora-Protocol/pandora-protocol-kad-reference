module.exports = function (WebSocketExtend) {

    return class MyWebSocketExtend extends WebSocketExtend {

        _getTimeoutWebSocketTime(){
            return (this.rendezvoused || this.isMyRendezvousSocket) ? KAD_OPTIONS.PLUGINS.CONTACT_RENDEZVOUS.T_WEBSOCKET_DISCONNECT_RENDEZVOUS : KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_INACTIVITY
        }

        _extendWebSocket(ws){
            super._extendWebSocket(ws);
            ws.socketConnectedAsRendezvousSocket = this.socketConnectedAsRendezvousSocket.bind(ws);
        }

        socketConnectedAsRendezvousSocket(){

            this.isMyRendezvousRelaySocket = true;
            this._kademliaRules._myRendezvousRelaySocket = this;

            this.addEventListener("close", function(event) {
                this._kademliaRules._myRendezvousRelaySocket = null;
            });

            this._updateTimeoutWebSocket(this);
        }

    }
}