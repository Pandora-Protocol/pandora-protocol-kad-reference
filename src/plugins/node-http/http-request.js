const ContactAddressProtocolType = require('../../contact/contact-address-protocol-type')

const httpRequest = require('http').request;
const httpsRequest = require('https').request;

module.exports = class HTTPRequest {

    constructor(kademliaRules) {
        this._kademliaRules = kademliaRules;
    }

    _createRequest(protocol, options) {

        if (protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP)
            return httpRequest(options);

        if (protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS)
            return httpsRequest(options);

        throw "Invalid protocol type";
    }

    /**
     * Implements the writable interface
     * @private
     */
    request( id, destContact,  buffer, callback) {

        if (this._kademliaRules._pending['http'+id])
            return callback(new Error('Pending Id already exists'));

        // NB: If originating an outbound request...
        let protocol;
        if (destContact.address.protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP) protocol = '';
        else if (destContact.address.protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS) protocol = 'https:';
        else throw "invalid protocol"

        const reqopts = {
            hostname: destContact.address.hostname,
            port: destContact.address.port,
            protocol: protocol,
            method: 'POST',
            headers: {
                'x-kad-id': id
            },
            encoding: 'binary',
        };

        //optional path
        if ( destContact.address.path) reqopts.address.path = destContact.address.path;

        const request = this._createRequest(destContact.address.protocol, reqopts);

        this._kademliaRules._pending['http'+id] = {
            timestamp: new Date().getTime(),
            response: (out)=> callback(null, out ),
            error: ()=> callback(new Error('Timeout'))
        };

        request.on('response', (response) => {

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
                    return this.emit('error', err);
                }

                const bufferAnswer = Buffer.concat(data);

                if (this._kademliaRules._pending['http'+id]) {
                    delete this._kademliaRules._pending['http'+id];
                    callback(null, bufferAnswer);
                }

            });

        });

        request.on('error', (err) => {
            err.dispose = id;
            this.emit('error', err);

            if (this._kademliaNode.rules._pending['http'+id]) {
                delete this._kademliaNode.rules._pending['http'+id];
                callback(err)
            }

        });
        request.end(buffer);
    }

}
