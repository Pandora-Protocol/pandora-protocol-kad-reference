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

        _mockSendSerialize (dstContact, command, data) {
            const id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
            return {
                id,
                out: [ id, kademliaRules._kademliaNode.contact, command, data ],
            }
        }

        _mockSendSerialized (id, dstContact, protocol, command, buffer)  {

            //fake some unreachbility
            if (!KAD_MOCKUP[dstContact.mockId] || Math.random() <= MOCKUP_SEND_ERROR_FREQUENCY ) {
                console.error("LOG: Message couldn't be sent", command, dstContact.identityHex, dstContact.hostname, dstContact.port );
                throw "Message couldn't be sent"
            }

            return new Promise((resolve)=>{

                setTimeout(async ()=>{

                    const out = await KAD_MOCKUP[dstContact.mockId].receiveSerialized( undefined, undefined, undefined, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK, buffer, {} );
                    resolve(out);

                }, Math.floor( Math.random() * 100) + 10)

            })

        }

        _mockReceiveSerialize (id, srcContact, out ) {
            return bencode.encode( BufferHelper.serializeData(out) );
        }

    }

}
