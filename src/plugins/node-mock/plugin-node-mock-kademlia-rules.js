const MOCKUP_SEND_ERROR_FREQUENCY = 0.001;
const ContactAddressProtocolType = require('../../contact/contact-address-protocol-type')
const bencode = require('bencode');
const BufferHelper = require('../../helpers/buffer-utils')

module.exports = function (kademliaRules) {

    const _start = kademliaRules.start.bind(kademliaRules);
    kademliaRules.start = start;

    const _stop = kademliaRules.stop.bind(kademliaRules);
    kademliaRules.stop = stop;

    if (ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK === undefined) throw new Error('Mock protocol was not initialized.');
    kademliaRules._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK] = {
        sendSerialize: (destContact, command, data) => {
            const id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
            return {
                id,
                buffer: bencode.encode( BufferHelper.serializeData([ id, kademliaRules._kademliaNode.contact, command, data ]) ),
            }
        },
        sendSerialized: (id, destContact, command, buffer, cb) => {

            //fake some unreachbility
            if (!global.KAD_MOCKUP[destContact.address.hostname+':'+destContact.address.port] || Math.random() <= MOCKUP_SEND_ERROR_FREQUENCY ) {
                console.error("LOG: Message couldn't be sent", command, destContact.identityHex, destContact.address.hostname, destContact.address.port );
                return cb(new Error("Message couldn't be sent"), null);
            }

            setTimeout(()=>{
                global.KAD_MOCKUP[destContact.address.hostname+':'+destContact.address.port].receiveSerialized( undefined, undefined, buffer, cb );
            }, Math.floor( Math.random() * 100) + 10)

        },
        receiveSerialize: (id, srcContact, out ) => {
            return bencode.encode( BufferHelper.serializeData(out) );
        }
    }


    function start() {

        _start(...arguments);

        if (!global.KAD_MOCKUP) global.KAD_MOCKUP = {};
        global.KAD_MOCKUP[this._kademliaNode.contact.address.hostname+':'+this._kademliaNode.contact.address.port] = this;

    }

    function stop(){
        _stop(...arguments);
        delete global.KAD_MOCKUP[this._kademliaNode.contact.identityHex];
    }

}
