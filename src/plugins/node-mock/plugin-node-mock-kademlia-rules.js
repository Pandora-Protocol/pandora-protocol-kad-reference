const MOCKUP_SEND_ERROR_FREQUENCY = 0.001;
const ContactAddressProtocolType = require('../../contact/contact-address-protocol-type')
const bencode = require('bencode');
const BufferHelper = require('../../helpers/buffer-utils')

module.exports = function (kademliaRules) {

    const _start = kademliaRules.start.bind(kademliaRules);
    kademliaRules.start = start;

    const _stop = kademliaRules.stop.bind(kademliaRules);
    kademliaRules.stop = stop;

    const _initContact = kademliaRules.initContact.bind(kademliaRules)
    kademliaRules.initContact = initContact;

    kademliaRules.mockId = Math.random().toString();

    async function start(opts) {

        const out = await _start(opts);

        if (!global.KAD_MOCKUP) global.KAD_MOCKUP = {};

        return {
            ...out,
            mock:{
                mockId: this.mockId,
            }
        }

    }

    function stop(){
        _stop(...arguments);
        delete KAD_MOCKUP[this.mockId];
    }

    function initContact(contact){
        _initContact(...arguments)
        this.mockId = contact.mockId;
        KAD_MOCKUP[ this.mockId ] = this;
    }

    if (ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK === undefined) throw new Error('Mock protocol was not initialized.');
    kademliaRules._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK] = {
        sendSerialize: sendSerialize.bind(kademliaRules),
        sendSerialized: sendSerialized.bind(kademliaRules),
        receiveSerialize: receiveSerialize.bind(kademliaRules),
    }

    function sendSerialize (destContact, command, data) {
        const id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
        return {
            id,
            out: [ id, kademliaRules._kademliaNode.contact, command, data ],
        }
    }

    function sendSerialized (id, destContact, protocol, command, buffer, cb)  {

        //fake some unreachbility
        if (!KAD_MOCKUP[destContact.mockId] || Math.random() <= MOCKUP_SEND_ERROR_FREQUENCY ) {
            console.error("LOG: Message couldn't be sent", command, destContact.identityHex, destContact.hostname, destContact.port );
            return cb(new Error("Message couldn't be sent"), null);
        }

        setTimeout(()=>{
            KAD_MOCKUP[destContact.mockId].receiveSerialized( undefined, undefined, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK, buffer, cb );
        }, Math.floor( Math.random() * 100) + 10)

    }

    function receiveSerialize (id, srcContact, out ) {
        return bencode.encode( BufferHelper.serializeData(out) );
    }

}
