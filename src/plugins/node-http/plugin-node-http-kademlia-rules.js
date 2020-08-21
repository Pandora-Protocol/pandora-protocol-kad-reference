const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')

const bencode = require('bencode');
const BufferHelper = require('../../helpers/buffer-utils')
const HTTPRequest = require('./http/http-request')

module.exports = function (options) {

    return class NewRules extends options.Rules{

        constructor() {

            super(...arguments);

            this._httpRequest = new HTTPRequest(this);

            if (typeof BROWSER === "undefined"){
                const HTTPServer = require('./http/http-server');
                this._httpServer = new HTTPServer( this._kademliaNode );
            }


            if (ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP === undefined) throw new Error('HTTP protocol was not initialized.');
            this._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP] =
            this._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS] = {
                sendSerialize: this._httpSendSerialize.bind(this),
                sendSerialized: this._httpSendSerialized.bind(this),
                receiveSerialize: this._httpReceiveSerialize.bind(this),
            };

        }

        async start(opts ){

            const out = await super.start(opts);

            if (this._httpServer)
                return {
                    ...out,
                    ... ( await this._httpServer.start(opts ) )
                };
            else
                return out;
        }

        stop(){
            super.stop(...arguments);

            if (this._httpServer)
                this._httpServer.stop();
        }

        _httpSendSerialize (dstContact, command, data) {
            const id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
            return {
                id,
                out: [ this._kademliaNode.contact, command, data ],
            }
        }

        _httpSendSerialized (id, dstContact, protocol, command, data, cb) {
            const buffer = Buffer.isBuffer(data) ? data : bencode.encode( data );
            this._httpRequest.request( id, dstContact, protocol, buffer, cb )
        }

        _httpReceiveSerialize (id, srcContact, out )  {
            return bencode.encode( BufferHelper.serializeData(out) );
        }

    }

}