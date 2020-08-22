const ContactAddressProtocolType = require('../../contact-type/contact-address-protocol-type')

const httpRequest = require('http').request;
const httpsRequest = require('https').request;

module.exports = class HTTPRequest {

    constructor(kademliaRules) {
        this._kademliaRules = kademliaRules;
    }

    _createRequest(opts) {

        if (opts.protocol === 'http:') return httpRequest(...arguments);
        if (opts.protocol === 'https:') return httpsRequest(...arguments);

        throw "Invalid protocol type";
    }

    /**
     * Implements the writable interface
     * @private
     */
    request( id, dstContact,  protocol, buffer, callback) {

        if (this._kademliaRules.pending.list['http:'+id])
            return callback(new Error('Pending Id already exists'));

        // NB: If originating an outbound request...
        if (protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP) protocol = 'http:';
        else if (protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS) protocol = 'https:';
        else throw "invalid protocol"

        const reqopts = {
            hostname: dstContact.hostname,
            port: dstContact.port,
            protocol: protocol,
            method: 'POST',
        };

        //optional path
        if ( dstContact.path) reqopts.path = dstContact.path;

        this._kademliaRules.pending.pendingAdd('http:'+id, '',  () => callback(new Error('Timeout')), out => callback(null, out ),  );

        const request = this._createRequest( reqopts, (response) =>{

            response.on('error', (err) => {
                this._kademliaRules.pending.pendingDelete('http:'+id)
                callback(err)
            });

            const data = [];
            response.on('data', (chunk) => {
                data.push(chunk);
            }).on('end', () => {

                if (response.statusCode >= 400) {
                    const err = new Error(buffer.toString());
                    err.dispose = id;
                    return request.emit('error', err);
                }

                const bufferAnswer = Buffer.concat(data);

                if (this._kademliaRules.pending.list['http:'+id]) {
                    this._kademliaRules.pending.pendingDelete('http:'+id);
                    callback(null, bufferAnswer);
                }

            });

        } );

        request.on('error', (err) => {

            err.dispose = id;

            if (this._kademliaRules.pending.list['http:'+id]) {
                this._kademliaRules.pending.pendingDelete('http:'+id);
                callback(err)
            }

        });
        request.end(buffer);
    }

}
