const WebRTConnection = require('./webrtc-connection')

/**
 * Based on https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/basic/js/main.js
 */

module.exports = class WebRTCConnectionRemote extends WebRTConnection{

    constructor() {

        super(...arguments);


        this._rtcPeerConnection.ondatachannel = (event) => {
            this._channel = event.channel;
            this._channel.onmessage = e => this._onChannelMessageCallback(e, this._channel);
            this._channel.onopen = e => this._onChannelStateChange(e, this._channel);
            this._channel.onclose = e => this._onChannelStateChange(e, this._channel);
        };

    }


    async useInitiatorOffer(offer, cb){

        try{

            await this._rtcPeerConnection.setRemoteDescription(offer);
            const answer = await this._rtcPeerConnection.createAnswer();
            await this._rtcPeerConnection.setLocalDescription(answer);

            cb(null, answer);

        }catch(err){
            return cb(err);
        }

    }


}