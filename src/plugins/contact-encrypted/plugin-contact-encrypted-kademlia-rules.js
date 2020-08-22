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

        _sendProcess(dstContact, protocol, data, opts = {}, cb){

            if (this._skipProtocolEncryptions[protocol] && !opts.forceEncryption) return super._sendProcess(...arguments);

            data = bencode.encode( BufferHelper.serializeData(data) );
            const signature = this._kademliaNode.contact.sign( CryptoUtils.sha256( data ) );
            data = [data, signature]

            ECCUtils.encrypt(dstContact.publicKey, bencode.encode(data), (err, out)=>{

                if (err) return cb(err);
                cb(null, bencode.encode(out));

            });
        }

        _receivedProcess(dstContact, protocol, buffer, opts, cb){

            if (this._skipProtocolEncryptions[protocol] && !opts.forceEncryption) return super._receivedProcess(...arguments);

            if (!dstContact) return cb(new Error('dstContact needs to be set for decryption'));

            const decoded = Buffer.isBuffer(buffer) ? bencode.decode(buffer) : buffer;
            if (!decoded) return cb( new Error('Error decoding data. Invalid bencode'));

            ECCUtils.decrypt(this._kademliaNode.contact.privateKey, decoded, (err, info)=>{

                if (err)
                    return cb(err);

                info = bencode.decode(info);
                if (!info) return cb(new Error("Error decoding the encrypted info"));
                const [payload, signature ] = info;

                if (!dstContact.verify( CryptoUtils.sha256(payload), signature )) return cb(new Error('Signature for encrypted message is invalid'));
                cb(null, payload);

            });
        }

        receiveSerialized( req, id, srcContact, protocol, buffer, opts = {}, cb){

            if (this._skipProtocolEncryptions[protocol] && !opts.forceEncryption) return super.receiveSerialized(...arguments);

            const decoded = Buffer.isBuffer(buffer) ? bencode.decode(buffer) : buffer;
            if (!decoded) return cb( new Error('Error decoding data. Invalid bencode'));

            ECCUtils.decrypt(this._kademliaNode.contact.privateKey, decoded, (err, info ) => {

                if (err)
                    return cb(err);

                info = bencode.decode(info);
                if (!info) return cb(new Error("Error decoding the encrypted info"));
                const [payload, signature ] = info;

                const decoded = this.decodeReceiveAnswer( id, srcContact, payload );
                if (!decoded) return cb( new Error('Error decoding data. Invalid bencode'));

                let c = 0;
                if (id === undefined) id = decoded[c++];
                if (srcContact === undefined) srcContact = decoded[c++];

                if (!srcContact.verify( CryptoUtils.sha256(payload), signature )) return cb(new Error('Signature for encrypted message is invalid'));
                if (opts.returnNotAllowed) return cb(null, decoded);

                this.receive( req, id, srcContact, decoded[c++], decoded[c++], (err, out )=>{

                    if (err) return cb(err);

                    out = bencode.encode( BufferHelper.serializeData(out) );
                    const signature = this._kademliaNode.contact.sign( CryptoUtils.sha256( out ) );
                    out = [out, signature]

                    ECCUtils.encrypt( srcContact.publicKey, bencode.encode( out ), (err, out)=>{

                        if (err) return cb(err);
                        if (!this._protocolSpecifics[ protocol ]) return cb(new Error("Can't contact"));

                        const {receiveSerialize} = this._protocolSpecifics[protocol];
                        const buffer = receiveSerialize(id, srcContact, out );
                        cb(null, buffer );

                    });

                });


            })

        }

    }

}