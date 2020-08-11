const ContactType = require('./contact-type')
const NextTick = require('../../helpers/next-tick')
const ContactAddressProtocolType = require('../../contact/contact-address-protocol-type')
const {setAsyncInterval, clearAsyncInterval} = require('../../helpers/async-interval')

module.exports = function(kademliaRules){

    kademliaRules._wsRelayedSocket = undefined;

    kademliaRules._selectRelay = _selectRelay;
    kademliaRules.setRelay = setRelay;
    kademliaRules._connectRelay = _connectRelay;
    kademliaRules.sendRelayJoin = sendRelayJoin;
    kademliaRules._setTimeoutWebSocket = _setTimeoutWebSocket;
    kademliaRules._socketConnectedAsRelaySocket = _socketConnectedAsRelaySocket;

    kademliaRules.relayedJoined = 0;
    kademliaRules._setRelayNow = _setRelayNow;

    const _start = kademliaRules.start.bind(kademliaRules);
    kademliaRules.start = start;

    const _stop = kademliaRules.stop.bind(kademliaRules);
    kademliaRules.stop = stop;

    async function start(opts){

        const out = await _start(opts);

        this._asyncIntervalSetRelay = await setAsyncInterval( this._setRelayNow.bind(this),  1000 );

        return out;
    }

    function stop(){
        clearAsyncInterval( this._asyncIntervalSetRelay );
        _stop();
    }

    kademliaRules._commands['RELAY_JOIN'] = relayJoin.bind(kademliaRules);

    function _setTimeoutWebSocket(ws){
        this._pending['ws'+ws.id] = {
            timestamp: new Date().getTime(),
            time: (ws.relayed || ws.isRelaySocket) ? KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_RELAY : KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_INACTIVITY,
            timeout: () => ws.close(),
        }
    }

    function relayJoin(req, srcContact, data, cb){

        if (srcContact) this._welcomeIfNewNode(srcContact);

        if (this.relayedJoined >= KAD_OPTIONS.PLUGINS.CONTACT_RELAY.RELAY_JOINED_MAX)
            return cb( new Error('FULL') );

        this.relayedJoined++;
        req.relayed = true;

        cb(null, [1] );

    }

    function sendRelayJoin(contact, cb){
        this.send(contact,'RELAY_JOIN', [  ],  cb);
    }

    function _selectRelay(array, cb){

        if (!array)
            array = this._kademliaNode.routingTable.array;

        let contact, index;

        while (true){

            if (!array.length) return cb(null, null );

            index = Math.floor( Math.random(  ) * array.length )
            contact = array[index].contact;

            array.splice(index, 1);

            if (contact.contactType === ContactType.CONTACT_TYPE_ENABLED)
                break;

        }

        this._kademliaNode.rules.sendRelayJoin(contact, (err, out)=> {

            if (out) return cb(null, contact );
            else NextTick( this._selectRelay.bind(this, array, cb) );

        });

    }

    function setRelay( cb ){

        this._selectRelay(undefined, (err, contact )=>{

            if (err) return cb(err);
            if (!contact) return cb(new Error("No relay"))

            this._connectRelay(contact, (err, out)=>{

                if (err) return cb(err);

                this._kademliaNode.contact.contactType = ContactType.CONTACT_TYPE_RELAY;
                this._kademliaNode.contact.relay = contact.toArrayBuffer();
                this._kademliaNode.contact.relayContact = contact;

                this._kademliaNode.contact.contactUpdated();

                cb(null, contact);

            })

        })
    }

    function _socketConnectedAsRelaySocket(ws){

        ws.isRelaySocket = true;
        this._wsRelayedSocket = ws;

        ws.onclosed = ()=>{
            this._wsRelayedSocket = null;
        }

        delete this._pending['ws'+ws.id];
    }

    function _connectRelay(contact, cb){

        const address = contact.hostname +':'+ contact.port + contact.path;

        let protocol = contact.getProtocol();
        if (protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP) protocol = ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;
        else if (protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS) protocol = ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_SECURED_WEBSOCKET;
        else return cb(new Error('Invalid protocol'));

        let ws = this.webSocketActiveConnectionsMap[address];
        if (ws) {
            this._socketConnectedAsRelaySocket(ws);
            return cb(null, ws )
        }

        this._createWebSocket(address, contact, protocol,(err, ws) => {

            if (err) return cb(err);
            this._socketConnectedAsRelaySocket(ws);
            cb(null, ws);

        });

    }

    function _setRelayNow( next ){

        if (this._kademliaNode.contact.contactType === ContactType.CONTACT_TYPE_ENABLED)
            return next(5000);

        if (this._wsRelayedSocket)
            return next(1000)

        this.setRelay( () => next(1000) );


    }

}