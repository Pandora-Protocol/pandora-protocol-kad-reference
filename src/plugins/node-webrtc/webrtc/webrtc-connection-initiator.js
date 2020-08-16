const WebRTConnection = require('./webrtc-connection')

/**
 * Based on https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/basic/js/main.js
 */

module.exports = class WebRTCConnection extends WebRTConnection{

    constructor() {

        super(...arguments);

        this._channel = this.createDataChannel('data');

        // this.onicecandidate = e => {
        //     onIceCandidate(localConnection, e);
        // };

        this._channel.onmessage = this._onSendMessageCallback;
        this._channel.onopen = this._onSendChannelStateChange;
        this._channel.onclose = this._onSendChannelStateChange;
    }

    createInitiatorOffer(cb){
        this.createOffer( description =>{
            this.setLocalDescription(description);
            cb(null, description)
        }, error =>{
            cb(error);
        })
    }

    userReceiverAnswer(answer, cb){

        this.setRemoteDescription(answer, sucess =>{
            cb(null, true)
        }, error =>{
            cb(error);
        });

    }


}