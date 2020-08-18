const WebRTC = require('./isomorphic-webrtc')

module.exports = class WebRTCConnection extends WebRTC.RTCPeerConnection{

    constructor(config = { iceServers: KAD_OPTIONS.PLUGINS.NODE_WEBRTC.ICE_SERVERS }) {

        super(...arguments);

        this._readyState = 'close';

        this.onconnect = undefined;
        this.ondisconnect = undefined;
        this.onmessage = undefined;

    }

    _onChannelMessageCallback(event, channel){

        const data = Buffer.from(event.data);
        if (this.onmessage)
            this.onmessage(data);

    }

    _onChannelStateChange(event, channel){
        this._readyState = channel.readyState;
        if (channel.readyState === 'open' && this.onconnect) this.onconnect(this);
        if (channel.readyState === 'close' && this.ondisconnect) this.ondisconnect(this);
    }

    sendData(data) {
        this._channel.send(data);
    }

    processData(data){

        for (const key in data)
            if (Buffer.isBuffer(data[key]) )
                data[key] = data[key].toString();

        return data;
    }

}