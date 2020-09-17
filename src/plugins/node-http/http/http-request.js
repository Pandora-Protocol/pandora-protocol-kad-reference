const ContactAddressProtocolType = require('../../contact-type/contact-address-protocol-type')

const httpRequest = require('http').request;
const httpsRequest = require('https').request;
const PromisesMap = require('../../../helpers/promises-map')

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
    request( id, dstContact,  protocol, buffer ) {

        if ( PromisesMap.get('http:'+id) )
            throw 'Pending Id already exists';

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
        if ( dstContact.path ) reqopts.path = dstContact.path;

        const promiseData = PromisesMap.add('http'+id, KAD_OPTIONS.T_RESPONSE_TIMEOUT);

        const request = this._createRequest( reqopts, (response) =>{

            response.on('error', err => promiseData.reject(err) );

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

                promiseData.resolve(bufferAnswer);

            });

        } );

        request.on('error', (err) => {

            err.dispose = id;
            promiseData.reject(err)

        });
        request.end(buffer);

        return promiseData.promise;

    }

}
