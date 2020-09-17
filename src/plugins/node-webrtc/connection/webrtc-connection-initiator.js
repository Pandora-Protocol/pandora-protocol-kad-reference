const WebRTConnection = require('./webrtc-connection')
const WebRTC = require('../webrtc/isomorphic-webrtc')

/**
 * Based on https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/basic/js/main.js
 */

module.exports = class WebRTCConnectionInitiator extends WebRTConnection{

    constructor() {

        super(...arguments);

        this._channel = this._rtcPeerConnection.createDataChannel('data', {
            ordered: false, // do not guarantee order
            maxPacketLifeTime: 3000, // in milliseconds
        });

        this._channel.onmessage = e => this.onmessage(e, this._channel);
        this._channel.onopen = e => this._onChannelStateChange(e, this._channel);
        this._channel.onclose = e => this._onChannelStateChange(e, this._channel);
        this._channel.onerror = e => this._onChannelStateChange(e, this._channel);
    }

    async createInitiatorOffer(){

        const offer = await this._rtcPeerConnection.createOffer(  );
        await this._rtcPeerConnection.setLocalDescription(offer);

        return this._rtcPeerConnection.localDescription;
    }

    async userRemoteAnswer(answer){

        answer = new WebRTC.RTCSessionDescription(answer);

        await this._rtcPeerConnection.setRemoteDescription(answer);
        this._iceCandidatesReady = true;
        this._useAllCandidates();

        return true;

    }


}