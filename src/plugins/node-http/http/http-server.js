const http = require('http');
const https = require('https');

const EventEmitter = require('events');
const publicIp = require('public-ip')
const ContactAddressProtocolType = require('../../contact-type/contact-address-protocol-type')
const HttpServerTestingFirewall = require('./http-server-testing-firewall')

module.exports = class HTTPServer extends EventEmitter {

    constructor(kademliaNode ) {
        super();

        this._kademliaNode = kademliaNode;
        this._started = false;
        this._starting = false;


        this.on('error',(err)=>{
            console.log(err);
        })
    }

    async start(opts){

        if (this._started || this._starting) throw("HTTP Server already started");
        this._starting = true;

        if (!opts.protocol) opts.protocol = ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
        if (!opts.path) opts.path = '';

        this.server = this._createServer(opts);
        this._serverFirewall = new HttpServerTestingFirewall(this.server);

        this.server.on('error', err => this.emit('error', err));

        await this.listen( opts );

        const fctReturn = async (hostname) => {

            const natTraversal = await this._serverFirewall._checkNatTraversal( { ...opts, hostname });

            this._read();

            this._starting = false;
            this._started = true;

            return {
                httpServer: {
                    hostname,
                    protocol: opts.protocol,
                    port: opts.port,
                    path: opts.path || '',
                    natTraversal,
                }
            }

        }

        if (opts.hostname)
            return fctReturn(opts.hostname);

        const v4 = await publicIp.v4();
        if (v4) return fctReturn(v4);

        const v6 = await publicIp.v6();
        if (v6) return fctReturn(v6);

    }

    stop(){
        if (!this._started) throw new Error("HTTP Server already stopped");
        this.close();
        this._started = false;
    }

    _createServer(opts) {
        if (opts.protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP) return http.createServer();
        if (opts.protocol === ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTPS) return https.createServer();
        throw "invalid protocol";
    }

    _read() {

        if (this.server.listeners('request').length)
            return;

        this.server.on('request', this._handle.bind(this) );
    }

    /**
     * Default request handler
     * @private
     */
    _handle(req, res) {

        req.on('error', err => this.emit('error', err));

        let id;
        try {
            id = Number.parseInt(req.headers['x-kad-id']);
            if (!id) throw "invalid id";
        }catch(err){
            res.statusCode = 400;
            return res.end();
        }

        res.setHeader('x-kad-id', req.headers['x-kad-id']);
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');

        if (req.method !== 'POST' && req.method !== 'OPTIONS')
            res.statusCode = 405;

        if (req.method !== 'POST')
            return res.end();

        const data = [];
        req.on('data', (chunk) => {
            data.push(chunk);
        }).on('end', () => {

            const buffer = Buffer.concat(data);

            this._kademliaNode.rules._pendingAdd('http'+id, () => {
                res.statusCode = 504;
                res.end('Gateway Timeout');
            }, (statusCode, buffer) => {
                res.statusCode = statusCode;
                res.end(buffer);
            });

            this._kademliaNode.rules.receiveSerialized( res, id, undefined, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP, buffer, (err, buffer)=>{

                if (this._kademliaNode.rules._pending['http'+id])
                    this._kademliaNode.rules._pendingResolveAll('http'+id, (resolve) => resolve(200, buffer) );

            });

        });

    }



    /**
     * Binds the server to the given address/port
     */
    listen(opts) {
        return new Promise((resolve, reject )=>{

            this.server.listen( opts.port, (err, out)=>{

                if (err)  reject(err);
                else resolve();

            });

        })
    }

    close(){
        this.server.close(...arguments);
    }

}