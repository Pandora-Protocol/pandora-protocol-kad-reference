const bencode = require('bencode');
const Contact = require('../../contact/contact')
const ECCUtils = require('../../helpers/ecc-utils')
const BufferHelper = require('../../helpers/buffer-utils')

module.exports = function (kademliaRules) {

    const _send = kademliaRules.send.bind(kademliaRules);
    kademliaRules.send = send;

    const _sendReceivedSerialized = kademliaRules.sendReceivedSerialized.bind(kademliaRules);
    kademliaRules.sendReceivedSerialized = sendReceivedSerialized;

    const _receiveSerialized = kademliaRules.receiveSerialized.bind(kademliaRules);
    kademliaRules.receiveSerialized = receiveSerialized;

    if (kademliaRules._kademliaNode.plugins.hasPlugin('PluginNodeHTTP')){
        kademliaRules._server.onReceive = receiveSerialized.bind(kademliaRules);
    }

    function send(destContact, command, data, cb){

        if ( destContact.identity.equals(this._kademliaNode.contact.identity) )
            return cb(new Error("Can't contact myself"));

        const {sendSerialize, sendSerialized, sendSerializeFinal} = this._protocolSpecifics[destContact.address.protocol];
        const { id, buffer} = sendSerialize(destContact, command, data);

        ECCUtils.encrypt(destContact.publicKey, buffer, (err, out)=>{

            if (err) return cb(err);

            sendSerialized(id, destContact, command, out, (err, out)=>{

                if (err) return cb(err);
                this.sendReceivedSerialized(destContact, command, out, cb);

            });

        })

    }


    function sendReceivedSerialized(destContact, command, buffer, cb){

        let decoded;
        if (Buffer.isBuffer(buffer)) decoded = bencode.decode(buffer);
        else decoded = buffer;

        if (!decoded) return cb( new Error('Error decoding data. Invalid bencode'));

        ECCUtils.decrypt(this._kademliaNode.contact.privateKey, decoded, (err, payload)=>{

            if (err) return cb(err);

            _sendReceivedSerialized(destContact, command, payload , cb );

        });

    }

    function receiveSerialized( id, srcContact, buffer, cb){

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

            this.receive( id, srcContact, decoded[c++], decoded[c++], (err, out )=>{

                if (err) return cb(err);

                const buffer = bencode.encode( BufferHelper.serializeData(out) );
                ECCUtils.encrypt( srcContact.publicKey, buffer, (err, out)=>{

                    if (err) return cb(err);

                    const {receiveSerialize} = this._protocolSpecifics[srcContact.address.protocol];
                    const buffer = receiveSerialize(id, srcContact, out );
                    cb(null, buffer );

                });

            });


        })

    }


}