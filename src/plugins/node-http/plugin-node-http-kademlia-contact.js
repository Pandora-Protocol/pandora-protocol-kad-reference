const ContactAddressProtocolType = require('../../contact/contact-address-protocol-type')
const ContactServerType = require('../../contact/contact-server-type')
const Validation = require('../../helpers/validation')

module.exports = function(kademliaNode) {

    kademliaNode.plugins.contactPlugins.push({
        createInitialize,
        create,
    })

    function createInitialize(){

    }

    function create(){

        this.contactServerType = arguments[this._additionalParameters++];
        if (!ContactServerType._map[this.contactServerType]) throw "Contact Server Type"

        if (this.contactServerType === ContactServerType.SERVER_TYPE_ENABLED ||
            this.contactServerType === ContactServerType.SERVER_TYPE_RELAY){

            this.protocol = arguments[this._additionalParameters++];
            Validation.validateProtocol(this.protocol);

            this.hostname = arguments[this._additionalParameters++].toString('ascii');
            Validation.validateHostname(this.hostname);

            this.port = arguments[this._additionalParameters++];
            Validation.validatePort(this.port);

            this.path = arguments[this._additionalParameters++].toString('ascii');
            Validation.validatePath(this.path);

        }

        const _toArray = this.toArray.bind(this);
        this.toArray = toArray;

        const _toJSON = this.toJSON.bind(this);
        this.toJSON = toJSON;

        this.getProtocol = getProtocol;

        //used for bencode
        function toArray(){
            const out =_toArray(...arguments);
            out.push(this.contactServerType);

            if (this.contactServerType === ContactServerType.SERVER_TYPE_ENABLED ||
                this.contactServerType === ContactServerType.SERVER_TYPE_RELAY){
                out.push(this.protocol);
                out.push(this.hostname);
                out.push(this.port);
                out.push(this.path);
            }
            return out;
        }

        function toJSON(){
            return {
                ..._toJSON(),
                contactServerType: this.contactServerType,
                protocol: this.protocol,
                hostname: this.hostname,
                port: this.port,
                path: this.path,
            }
        }

        function getProtocol(command, data){
            return this.protocol;
        }

    }
}