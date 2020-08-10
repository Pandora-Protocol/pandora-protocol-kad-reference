const ContactAddressProtocolType = require('../../contact/contact-address-protocol-type')

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
    request( id, destContact,  protocol, buffer, callback) {

        if (this._kademliaRules._pending['http'+id])
            return callback(new Error('Pending Id already exists'));

        // NB: If originating an outbound request...
        if (protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP) protocol = 'http:';
        else if (protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS) protocol = 'https:';
        else throw "invalid protocol"

        const reqopts = {
            hostname: destContact.hostname,
            port: destContact.port,
            protocol: protocol,
            method: 'POST',
            headers: {
                'x-kad-id': id
            },
            encoding: 'binary',
        };

        //optional path
        if ( destContact.path) reqopts.path = destContact.path;

        this._kademliaRules._pending['http'+id] = {
            timestamp: new Date().getTime(),
            response: out => {
                delete this._kademliaRules._pending['http'+id];
                return callback(null, out );
            },
            timeout: () => callback(new Error('Timeout'))
        };

        const request = this._createRequest( reqopts, (response) =>{

            response.on('error', (err) => {
                this.emit('error', err)
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

                if (this._kademliaRules._pending['http'+id]) {
                    delete this._kademliaRules._pending['http'+id];
                    callback(null, bufferAnswer);
                }

            });

        } );

        request.on('error', (err) => {
            err.dispose = id;
            request.emit('error', err);

            if (this._kademliaNode.rules._pending['http'+id]) {
                delete this._kademliaNode.rules._pending['http'+id];
                callback(err)
            }

        });
        request.end(buffer);
    }

}
