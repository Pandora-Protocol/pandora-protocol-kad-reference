const http = require('http');
const https = require('https');
const EventEmitter = require('events');

module.exports = class HTTPServer extends EventEmitter {

    constructor(kademliaNode ) {
        super();

        this._kademliaNode = kademliaNode;
        this._started = false;

        this.server = this._createServer(this._options);
        this.server.on('error', err => this.emit('error', err));

        this.on('error',(err)=>{
            console.log(err);
        })
    }

    start(){
        if (this._started) throw new Error("HTTP Server already started");
        this.listen( this._kademliaNode.contact.address.port );
        this._read();
        this._started = true;
    }

    stop(){
        if (!this._started) throw new Error("HTTP Server already stopped");
        this.close();
        this._started = false;
    }

    _createServer() {
        return http.createServer();
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
            this._kademliaNode.rules._pending['http'+id] = {
                timestamp: new Date().getTime(),
                timeout: ()=>{
                    res.statusCode = 504;
                    res.response.end('Gateway Timeout');
                },
                cb: (buffer) =>{
                    res.end(buffer);
                }
            };

            this._kademliaNode.rules.receiveSerialized( id, undefined, buffer, (err, buffer)=>{

                if (this._kademliaNode.rules._pending['http'+id]) {
                    delete this._kademliaNode.rules._pending['http'+id];
                    res.end(buffer);
                }

            });

        });

    }



    /**
     * Binds the server to the given address/port
     */
    listen() {
        this.server.listen(...arguments);
    }

    close(){
        this.server.close(...arguments);
    }

}