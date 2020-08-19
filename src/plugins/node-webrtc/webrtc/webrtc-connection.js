const WebRTC = require('./isomorphic-webrtc')

module.exports = class WebRTCConnection extends WebRTC.RTCPeerConnection{

    constructor(config = { iceServers: KAD_OPTIONS.PLUGINS.NODE_WEBRTC.ICE_SERVERS }) {

        super(...arguments);

        this._readyState = 'close';

        this.onconnect = undefined;
        this.ondisconnect = undefined;
        this.onmessage = undefined;

        this.chunkSize = 0;

    }

    setChunkSize(otherPeerMaxChunkSize, myMaxChunkSize = this.getMaxChunkSize()){

        if ( typeof otherPeerMaxChunkSize !== "number") throw "invalid otherPeerMaxChunkSize";
        if (otherPeerMaxChunkSize < 16*1024) throw "invalid value otherPeerMaxChunkSize";

        this.chunkSize = Math.min(otherPeerMaxChunkSize, myMaxChunkSize)
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

    /**
     * https://lgrahl.de/articles/demystifying-webrtc-dc-size-limit.html
     * @returns {number}
     */
    getMaxChunkSize(){

        if (typeof BROWSER !== "undefined"){

            let firefoxVersion = window.navigator.userAgent.match(/Firefox\/([0-9]+)\./);
            firefoxVersion = firefoxVersion ? parseInt(firefoxVersion[2]) : 0;
            if (firefoxVersion >= 57) return 64 * 1024; //64kb

            let chromiumVersion = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
            chromiumVersion = chromiumVersion ? parseInt(chromiumVersion[2]) : 0;
            if (chromiumVersion) return 256 * 1024;

        } else {

            return 256*1024; // https://github.com/node-webrtc/node-webrtc/issues/202#issuecomment-489452004

        }

        return 16*1024;
    }

}