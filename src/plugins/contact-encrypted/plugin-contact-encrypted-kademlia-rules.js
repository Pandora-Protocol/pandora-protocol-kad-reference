const bencode = require('bencode');
const Contact = require('../../contact/contact')
const ECCUtils = require('../../helpers/ecc-utils')
const BufferHelper = require('../../helpers/buffer-utils')

module.exports = function (options) {

    return class MyOptions extends options.Rules{

        constructor() {

            super(...arguments);

            if (typeof window === "undefined" && this._kademliaNode.plugins.hasPlugin('PluginNodeHTTP')){
                this._httpServer.onReceive = this.receiveSerialized.bind(this);
            }

        }

        _sendProcess(destContact, command, data, cb){
            ECCUtils.encrypt(destContact.publicKey,  bencode.encode(BufferHelper.serializeData(data) ), (err, out)=>{
                if (err) return cb(err);
                cb(null, bencode.encode(out));
            });
        }

        _receivedProcess(destContact, command, buffer, cb){
            let decoded = buffer;
            if (Buffer.isBuffer(buffer)) decoded = bencode.decode(buffer);

            if (!decoded) return cb( new Error('Error decoding data. Invalid bencode'));
            ECCUtils.decrypt(this._kademliaNode.contact.privateKey, decoded, cb);
        }

        receiveSerialized( req, id, srcContact, protocol, buffer, cb){

            let decoded;
            if (Buffer.isBuffer(buffer) ) decoded = bencode.decode(buffer);
            else decoded = buffer;

            if (!decoded) return cb( new Error('Error decoding data. Invalid bencode'));

            ECCUtils.decrypt(this._kademliaNode.contact.privateKey, decoded, (err, payload)=>{

                if (err) return cb(err);

                const decoded = this.decodeReceiveAnswer( id, srcContact, payload );
                if (!decoded) cb( new Error('Error decoding data. Invalid bencode'));

                let c = 0;
                if (id === undefined) id = decoded[c++];
                if (srcContact === undefined) srcContact = decoded[c++];

                this.receive( req, id, srcContact, decoded[c++], decoded[c++], (err, out )=>{

                    if (err) return cb(err);

                    const buffer = bencode.encode( BufferHelper.serializeData(out) );
                    ECCUtils.encrypt( srcContact.publicKey, buffer, (err, out)=>{

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