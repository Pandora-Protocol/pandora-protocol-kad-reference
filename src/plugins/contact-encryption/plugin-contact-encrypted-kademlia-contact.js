
module.exports = function(kademliaNode) {

    kademliaNode.plugins.contactPlugins.push({
        create,
    })

    function create(  ){

        const publicKey = arguments[this._additionalParameters++];
        if (!Buffer.isBuffer(publicKey) || publicKey.length !== 65) throw "Invalid Contact Public Key";
        this.publicKey = publicKey;

        const _toArray = this.toArray.bind(this);
        this.toArray = toArray;

        const _toJSON = this.toJSON.bind(this);
        this.toJSON = toJSON;

        //used for bencode
        function toArray(){
            return [ ..._toArray(...arguments), this.publicKey ];
        }

        function toJSON(){
            return {
                ..._toJSON(),
                publicKey: this.publicKey,
            }
        }

    }

}