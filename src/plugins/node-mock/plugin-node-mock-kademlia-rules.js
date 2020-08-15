const MOCKUP_SEND_ERROR_FREQUENCY = 0.001;
const ContactAddressProtocolType = require('../contact-type/contact-address-protocol-type')
const bencode = require('bencode');
const BufferHelper = require('../../helpers/buffer-utils')

module.exports = function (options) {

    return class NewRules extends options.Rules {

        constructor() {

            super(...arguments);

            this.mockId = Math.random().toString();

            if (ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK === undefined) throw new Error('Mock protocol was not initialized.');
            this._protocolSpecifics[ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK] = {
                sendSerialize: this._mockSendSerialize.bind(this),
                sendSerialized: this._mockSendSerialized.bind(this),
                receiveSerialize: this._mockReceiveSerialize.bind(this),
            }
        }

        async start(opts) {

            const out = await super.start(...arguments);

            if (!global.KAD_MOCKUP) global.KAD_MOCKUP = {};

            return {
                ...out,
                mock:{
                    mockId: this.mockId,
                }
            }

        }

        stop(){
            super.stop(...arguments);
            delete KAD_MOCKUP[this.mockId];
        }

        initContact(contact){

            super.initContact(...arguments)

            this.mockId = contact.mockId;
            KAD_MOCKUP[ this.mockId ] = this;

        }

        _mockSendSerialize (destContact, command, data) {
            const id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
            return {
                id,
                out: [ id, kademliaRules._kademliaNode.contact, command, data ],
            }
        }

        _mockSendSerialized (id, destContact, protocol, command, buffer, cb)  {

            //fake some unreachbility
            if (!KAD_MOCKUP[destContact.mockId] || Math.random() <= MOCKUP_SEND_ERROR_FREQUENCY ) {
                console.error("LOG: Message couldn't be sent", command, destContact.identityHex, destContact.hostname, destContact.port );
                return cb(new Error("Message couldn't be sent"), null);
            }

            setTimeout(()=>{
                KAD_MOCKUP[destContact.mockId].receiveSerialized( undefined, undefined, undefined, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK, buffer, cb );
            }, Math.floor( Math.random() * 100) + 10)

        }

        _mockReceiveSerialize (id, srcContact, out ) {
            return bencode.encode( BufferHelper.serializeData(out) );
        }

    }

}
