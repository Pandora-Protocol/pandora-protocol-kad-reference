const WebRTC = require('./webrtc')

module.exports = class WebRTCConnection extends WebRTC.RTCPeerConnection{

    constructor(config = { iceServers: KAD_OPTIONS.PLUGINS.NODE_WEBRTC.ICE_SERVERS }) {
        super(...arguments);

        this._readyState = 'close';

    }

    _onSendMessageCallback(event){
        console.log("Received", event.data);
        return event.data;
    }

    _onSendChannelStateChange(event){
        this._readyState = this._channel.readyState;
        console.log(this._readyState);
    }

    sendData(data) {
        this._channel.send(data);
    }


}