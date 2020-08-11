const ContactAddressProtocolType = require('../../contact/contact-address-protocol-type')

const bencode = require('bencode');
const BufferHelper = require('../../helpers/buffer-utils')
const {setAsyncInterval, clearAsyncInterval} = require('../../helpers/async-interval')
const HTTPRequest = require('./http/http-request')
const NextTick = require('../../helpers/next-tick')

module.exports = function (kademliaRules) {

    if (typeof BROWSER === "undefined"){
        const HTTPServer = require('./http/http-server');
        kademliaRules._httpServer = new HTTPServer( kademliaRules._kademliaNode );
    }

    kademliaRules._httpRequest = new HTTPRequest(kademliaRules);

    const _start = kademliaRules.start.bind(kademliaRules);
    kademliaRules.start = start;

    const _stop = kademliaRules.stop.bind(kademliaRules);
    kademliaRules.stop = stop;


    async function start(opts ){

        const out = await _start(opts);

        if (this._httpServer)
            return {
                ...out,
                ... ( await this._httpServer.start(opts ) )
            };
        else
            return out;
    }

    function stop(){
        _stop(...arguments);

        if (this._httpServer)
            this._httpServer.stop();
    }





    if (ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP === undefined) throw new Error('HTTP protocol was not initialized.');
    kademliaRules._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP] =
    kademliaRules._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS] = {
        sendSerialize: sendSerialize.bind(kademliaRules),
        sendSerialized: sendSerialized.bind(kademliaRules),
        receiveSerialize: receiveSerialize.bind(kademliaRules),
    };

    function sendSerialize (destContact, command, data) {
        const id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
        return {
            id,
            out: [ this._kademliaNode.contact, command, data ],
        }
    }

    function sendSerialized (id, destContact, protocol, command, data, cb) {
        const buffer = Buffer.isBuffer(data) ? data : bencode.encode( data );
        this._httpRequest.request( id, destContact, protocol, buffer, cb )
    }

    function receiveSerialize (id, srcContact, out )  {
        return bencode.encode( BufferHelper.serializeData(out) );
    }

}