const bencode = require('bencode');
const Contact = require('../../contact/contact')
const ECCUtils = require('../../helpers/ecc-utils')
const BufferHelper = require('../../helpers/buffer-utils')

module.exports = function (options) {

    return class MyOptions extends options.Rules{

        constructor() {

            super(...arguments);

            if (!this._skipProtocolEncryptions) this._skipProtocolEncryptions = {};

            if (typeof window === "undefined" && this._kademliaNode.plugins.hasPlugin('PluginNodeHTTP'))
                this._httpServer.onReceive = this.receiveSerialized.bind(this);


        }

        _sendProcess(destContact, protocol, command, data, opts = {}){

            if (this._skipProtocolEncryptions[protocol] && !opts.skipProtocolEncryption) return super._sendProcess(...arguments);

            return ECCUtils.encrypt( bencode.encode(BufferHelper.serializeData(data) ), destContact.boxPublicKey, this._kademliaNode.contact.boxPrivateKey  )
        }

        _receivedProcess(destContact, protocol, command, buffer, opts = {}){

            if (this._skipProtocolEncryptions[protocol]) return super._receivedProcess(...arguments);

            const decoded = Buffer.isBuffer(buffer) ? bencode.decode(buffer) : buffer;
            if (!decoded) return null;

            return ECCUtils.decrypt( decoded[1], decoded[0], this._kademliaNode.contact.privateKey);
        }

        receiveSerialized( req, id, srcContact, protocol, buffer, cb){

            if (this._skipProtocolEncryptions[protocol]) return super.receiveSerialized(...arguments);

            const decoded = Buffer.isBuffer(buffer) ? bencode.decode(buffer) : buffer;
            if (!decoded) return cb( new Error('Error decoding data. Invalid bencode'));

            const payload = ECCUtils.decrypt( decoded[1], decoded[0], srcContact.boxPublicKey, this._kademliaNode.contact.boxPrivateKey );
            if (!payload) return cb(new Error('Error decoding. Invalid received data'));

            const decodedAnswer = this.decodeReceiveAnswer( id, srcContact, payload );
            if (!decodedAnswer) cb( new Error('Error decoding data. Invalid bencode'));

            let c = 0;
            if (id === undefined) id = decodedAnswer[c++];
            if (srcContact === undefined) srcContact = decodedAnswer[c++];

            this.receive( req, id, srcContact, decodedAnswer[c++], decodedAnswer[c++], (err, out )=>{

                if (err) return cb(err);

                const buffer = bencode.encode( BufferHelper.serializeData(out) );
                const final = ECCUtils.encrypt( buffer,srcContact.publicKey, this._kademliaNode.contact.privateKey );
                if (!final) return cb(new Error("ECC couldn't decrypt "))

                if (!this._protocolSpecifics[ protocol ]) return cb(new Error("Can't contact"));

                const {receiveSerialize} = this._protocolSpecifics[protocol];
                const finalBuffer = receiveSerialize(id, srcContact, final );
                cb(null, buffer );

            });


        }

    }

}