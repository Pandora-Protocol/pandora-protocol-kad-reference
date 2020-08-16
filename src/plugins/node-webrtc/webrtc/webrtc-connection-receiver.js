const WebRTConnection = require('./webrtc-connection')

/**
 * Based on https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/basic/js/main.js
 */

module.exports = class WebRTCConnection extends WebRTConnection{

    constructor() {

        super(...arguments);


        // this.onicecandidate = e => {
        //     onIceCandidate(remoteConnection, e);
        // };

        this.ondatachannel = (event) => {
            this._channel = event.channel;
            this._channel.onmessage = this._onReceiveMessageCallback;
            this._channel.onopen = this._onReceiveChannelStateChange;
            this._channel.onclose = this._onReceiveChannelStateChange;
        };

    }


    useInitiatorOffer(offer, cb){

        this.setRemoteDescription(offer);
        this.createAnswer( description => {

            this.setLocalDescription(description);
            cb(null, description )

        }, error => {
            cb(error);
        });
    }


}