const ContactType = require('../contact-relay/contact-type')
const Validation = require('../../helpers/validation')

module.exports = function(kademliaNode) {

    kademliaNode.plugins.contactPlugins.push({
        create,
    })


    function create(){

        this.contactType = arguments[this._additionalParameters++];
        if (!ContactType._map[this.contactType]) throw "Contact Server Type"

        if (this.contactType === ContactType.CONTACT_TYPE_ENABLED){

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

        const _importContactNewer = this.importContactNewer.bind(this);
        this.importContactNewer = importContactNewer;

        this.getProtocol = getProtocol;

        //used for bencode
        function toArray(){

            const out = _toArray(...arguments);

            out.push(this.contactType);

            if (this.contactType === ContactType.CONTACT_TYPE_ENABLED ){
                out.push(this.protocol);
                out.push(this.hostname);
                out.push(this.port);
                out.push(this.path);
            }

            return out;
        }

        function toJSON(){

            const out = _toJSON();

            out.contactType = this.contactType;

            if (this.contactType === ContactType.CONTACT_TYPE_ENABLED){
                out.protocol = this.protocol;
                out.hostname = this.hostname;
                out.port = this.port;
                out.path = this.path;
            }

            return out;
        }

        function getProtocol(command, data){
            return this.protocol;
        }

        function importContactNewer(newContact){

            _importContactNewer(newContact);

            this.contactType = newContact.contactType;

            if (newContact.contactType === ContactType.CONTACT_TYPE_ENABLED){
                this.protocol = newContact.protocol;
                this.hostname = newContact.hostname;
                this.port = newContact.port;
                this.path = newContact.path;
            } else {
                delete this.protocol;
                delete this.hostname;
                delete this.port;
                delete this.path;
            }

        }

    }
}