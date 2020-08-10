const ContactAddressProtocolType = require('../../contact/contact-address-protocol-type')

module.exports = function(kademliaNode) {

    kademliaNode.plugins.contactPlugins.push({
        createInitialize,
        create,
    })

    function createInitialize(){

    }

    function create(){

        this.mockId = arguments[this._additionalParameters++].toString('ascii');
        if (!this.mockId || typeof this.mockId !== "string") throw "Mock id is invalid";

        const _toArray = this.toArray.bind(this);
        this.toArray = toArray;

        const _toJSON = this.toJSON.bind(this);
        this.toJSON = toJSON;

        //used for bencode
        function toArray(){
            return [ ..._toArray(...arguments), this.mockId ];
        }

        function toJSON(){
            return {
                ..._toJSON(),
                mockId: this.mockId,
            }
        }

        function getProtocol(command, data){
            return ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK;
        }

    }
}