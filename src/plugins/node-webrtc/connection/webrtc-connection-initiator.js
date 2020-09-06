const WebRTConnection = require('./webrtc-connection')

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
    }

    async createInitiatorOffer(cb){

        let description;

        try{

            description = await this._rtcPeerConnection.createOffer(  );
            await this._rtcPeerConnection.setLocalDescription(description);

        }catch(err){
            return cb(err);
        }

        cb(null, description);

    }

    async userRemoteAnswer(answer, cb){

        try{
            await this._rtcPeerConnection.setRemoteDescription(answer);
        }catch(err){
            return cb(err);
        }

        cb(null, true);

    }


}