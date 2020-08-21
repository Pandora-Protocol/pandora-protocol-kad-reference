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

        _sendProcess(destContact, protocol, data, opts = {}, cb){

            if (this._skipProtocolEncryptions[protocol] && !opts.forceEncryption) return super._sendProcess(...arguments);

            ECCUtils.encrypt(destContact.publicKey,  bencode.encode(BufferHelper.serializeData(data) ), (err, out)=>{

                if (err) return cb(err);

                out.unshift(this._kademliaNode.contact.sign(out[3]));

                cb(null, bencode.encode(out));
            });
        }

        _receivedProcess(destContact, protocol, buffer, opts, cb){

            if (this._skipProtocolEncryptions[protocol] && !opts.forceEncryption) return super._receivedProcess(...arguments);

            if (!destContact) return cb(new Error('destContact needs to be set for decryption'));

            const decoded = Buffer.isBuffer(buffer) ? bencode.decode(buffer) : buffer;
            if (!decoded) return cb( new Error('Error decoding data. Invalid bencode'));

            const signatureBuffer = decoded[4];
            const signature = decoded[0];
            decoded.splice(0, 1);

            ECCUtils.decrypt(this._kademliaNode.contact.privateKey, decoded, (err, payload)=>{

                if (err) return cb(err);

                if (!destContact.verify( signatureBuffer, signature )) return cb(new Error('Signature for encrypted message is invalid'));
                cb(null, payload);

            });
        }

        receiveSerialized( req, id, srcContact, protocol, buffer, opts = {}, cb){

            if (this._skipProtocolEncryptions[protocol] && !opts.forceEncryption) return super.receiveSerialized(...arguments);

            const decoded = Buffer.isBuffer(buffer) ? bencode.decode(buffer) : buffer;
            if (!decoded) return cb( new Error('Error decoding data. Invalid bencode'));

            const signatureBuffer = decoded[4];
            const signature = decoded[0];
            decoded.splice(0, 1);

            ECCUtils.decrypt(this._kademliaNode.contact.privateKey, decoded, (err, payload)=>{

                if (err) return cb(err);

                const decoded = this.decodeReceiveAnswer( id, srcContact, payload );
                if (!decoded) return cb( new Error('Error decoding data. Invalid bencode'));

                let c = 0;
                if (id === undefined) id = decoded[c++];
                if (srcContact === undefined) srcContact = decoded[c++];

                if (!srcContact.verify( signatureBuffer, signature )) return cb(new Error('Signature for encrypted message is invalid'));
                if (opts.returnNotAllowed) return cb(null, decoded);

                this.receive( req, id, srcContact, decoded[c++], decoded[c++], (err, out )=>{

                    if (err) return cb(err);

                    const buffer = bencode.encode( BufferHelper.serializeData(out) );
                    ECCUtils.encrypt( srcContact.publicKey, buffer, (err, out)=>{

                        if (err) return cb(err);

                        if (!this._protocolSpecifics[ protocol ]) return cb(new Error("Can't contact"));

                        out.unshift(this._kademliaNode.contact.sign(out[3]));

                        const {receiveSerialize} = this._protocolSpecifics[protocol];
                        const buffer = receiveSerialize(id, srcContact, out );
                        cb(null, buffer );

                    });

                });


            })

        }

    }

}