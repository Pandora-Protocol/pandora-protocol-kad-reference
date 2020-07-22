const Validation = require('./../helpers/validation')

module.exports = class ContactAddress {

    constructor( kademliaNode, version, identity, protocol, hostname, port, path ) {

        Validation.validateProtocol(protocol);
        Validation.validateHostname(hostname);
        Validation.validatePort(port);
        Validation.validatePath(path);

        this.protocol = protocol;
        this.hostname = hostname;
        this.port = port;
        this.path = path;
    }

    toArray(){
        return [  this.protocol, Buffer.from(this.hostname, "ascii"), this.port, Buffer.from(this.path, "ascii") ];
    }

    toJSON(){
        return {
            protocol: this.protocol,
            hostname: this.hostname,
            port: this.port,
            path: this.path,
        }
    }

}
