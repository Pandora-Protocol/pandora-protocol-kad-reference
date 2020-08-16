module.exports = function (options) {

    return class MyRules extends options.Rules {

        constructor() {
            super(...arguments);

            this._commands['RNDZ_WRTC_CON'] = this.rendezvousWebRTCConnection.bind(this);
        }

        rendezvousWebRTCConnection(req, srcContact, data, cb){

        }

        sendRendezvousWebRTCConnection(contact, identity, cb){
            this.send(contact, 'RNDZ_WRTC_CON', [identity], cb)
        }

    }

}