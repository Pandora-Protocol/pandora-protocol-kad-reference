const WebRTC = require('./webrtc')

module.exports = class WebRTCConnection extends WebRTC.RTCPeerConnection{

    constructor(config = { iceServers: KAD_OPTIONS.PLUGINS.NODE_WEBRTC.ICE_SERVERS }) {

        super(...arguments);

        this._readyState = 'close';


    }

    _onChannelMessageCallback(event, channel){
        console.log("Received", event.data);
        return event.data;
    }

    _onChannelStateChange(event, channel){
        this._readyState = channel.readyState;
    }

    sendData(data) {
        this._channel.send(data);
    }


}