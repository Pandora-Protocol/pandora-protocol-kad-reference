const bencode = require('bencode');
const ECCUtils = require('../../helpers/ecc-utils')
const CryptoUtils = require('../../helpers/crypto-utils')
const BufferHelper = require('../../helpers/buffer-utils')

module.exports = function (options) {

    return class MyOptions extends options.Rules{

        constructor() {

            super(...arguments);

            if (!this._skipProtocolEncryptions) this._skipProtocolEncryptions = {};

            if (typeof window === "undefined" && this._kademliaNode.plugins.hasPlugin('PluginNodeHTTP'))
                this._httpServer.onReceive = this.receiveSerialized.bind(this);


        }

        async _sendProcess(dstContact, protocol, data, opts = {}){

            if (this._skipProtocolEncryptions[protocol] && !opts.forceEncryption) return super._sendProcess(...arguments);

            data = bencode.encode( BufferHelper.serializeData(data) );
            const signature = this._kademliaNode.contact.sign( CryptoUtils.sha256( data ) );
            data = [data, signature]

            const out = await ECCUtils.encrypt(dstContact.publicKey, bencode.encode(data) );
            return bencode.encode(out);
        }

        async _receivedProcess(dstContact, protocol, buffer, opts){

            if (this._skipProtocolEncryptions[protocol] && !opts.forceEncryption) return super._receivedProcess(...arguments);

            if (!dstContact) throw 'dstContact needs to be set for decryption';

            const decoded = Buffer.isBuffer(buffer) ? bencode.decode(buffer) : buffer;
            if (!decoded) throw 'Error decoding data. Invalid bencode';

            const decrypted = await ECCUtils.decrypt(this._kademliaNode.contact.privateKey, decoded);

            const info = bencode.decode(decrypted);
            if (!info) throw "Error decoding the encrypted info";

            const [payload, signature ] = info;

            if (!dstContact.verify( CryptoUtils.sha256(payload), signature ))
                throw 'Signature for encrypted message is invalid';

            return payload;

        }

        async receiveSerialized( req, id, srcContact, protocol, buffer, opts = {}){

            if (this._skipProtocolEncryptions[protocol] && !opts.forceEncryption) return super.receiveSerialized(...arguments);

            const decoded = Buffer.isBuffer(buffer) ? bencode.decode(buffer) : buffer;
            if (!decoded) throw 'Error decoding data. Invalid bencode';

            const decrypted = await ECCUtils.decrypt(this._kademliaNode.contact.privateKey, decoded);

            const info = bencode.decode(decrypted);
            if (!info) throw "Error decoding the encrypted info";

            const [payload, signature ] = info;

            const answerDecoded = this.decodeReceiveAnswer( id, srcContact, payload );
            if (!answerDecoded) throw 'Error decoding data. Invalid bencode';

            let c = 0;
            if (id === undefined) id = answerDecoded[c++];
            if (srcContact === undefined) srcContact = answerDecoded[c++];

            if (!srcContact.verify( CryptoUtils.sha256(payload), signature )) throw 'Signature for encrypted message is invalid';
            if (opts.returnNotAllowed) return answerDecoded;

            const outReceived = await this.receive( req, id, srcContact, answerDecoded[c++], answerDecoded[c++]);

            const myOut = bencode.encode( BufferHelper.serializeData(outReceived) );
            const mySignature = this._kademliaNode.contact.sign( CryptoUtils.sha256( myOut ) );

            const out = await ECCUtils.encrypt( srcContact.publicKey, bencode.encode(  [myOut, mySignature] ) );

            if (!this._protocolSpecifics[ protocol ]) throw "Can't contact";

            const {receiveSerialize} = this._protocolSpecifics[protocol];
            const finalBuffer = receiveSerialize(id, srcContact, out );

            return finalBuffer;

        }

    }

}