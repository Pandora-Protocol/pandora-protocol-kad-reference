const httpRequest = require('http').request;
const httpsRequest = require('https').request;

module.exports = class HttpServerTestingFirewall {

    constructor(httpServer) {

        this._httpServer = httpServer;

        this._id = Math.random().toString();
    }

    _createsRequest(opts){

        if (opts.protocol === 'http:') return httpRequest(...arguments);
        if (opts.protocol === 'https:') return httpsRequest(...arguments);
        
        throw "Invalid protocol type";

    }

    async _firewallPing(opts){

        return new Promise((resolve, reject)=>{

            const req = this._createsRequest( {
                ...opts,
                protocol: 'http:',
                headers: {},
                method: 'POST',
                path: '/testing-firewall/'+this._id,
            }, (res) => {

                res.setEncoding('utf8');
                let output = '';

                res.on('data',  (chunk) => {
                    output += chunk;
                });
                res.on('error', (e)=>{
                    reject(e);
                })
                res.on('end',()=>{
                    if (res.statusCode === 200 && output === this._id)
                        resolve(true);
                    else
                        reject(data);
                });

            });

            req.on('error', function(e) {
                reject(e);
            });

            req.end(this._id);

        });

    }

    _handle(req, res) {

        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method !== 'POST') {
            res.statusCode = 405;
            return res.end();
        }
        if (req.url !== '/testing-firewall/'+this._id){
            res.statusCode = 405;
            return res.end('invalid-request');
        }

        let data = '';
        req.on('err', ()=>{
            console.error(err);
        })
        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', () => {

            if (data === this._id){
                res.statusCode = 200;
                res.end(this._id);
            } else {
                res.statusCode = 405;
                res.end('invalid parameter');
            }

        });

    }

    start(){

        this._httpServer.on('request', this._handle.bind(this) );

    }

    stop(){

        delete this._httpServer._events.request;

    }

    async _checkNatTraversal( opt ){

        this.start();

        let answer = false;

        try{
            
            await this._firewallPing( opt, )
            answer = true;

        }catch(err){

        }

        this.stop();
        return answer;

    }


}