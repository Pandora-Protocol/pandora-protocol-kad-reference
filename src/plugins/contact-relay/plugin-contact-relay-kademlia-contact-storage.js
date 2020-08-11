const ContactType = require('../contact-relay/contact-type')

module.exports = function (contactStorage){

    const _createContactArgs = contactStorage.createContactArgs.bind(contactStorage);
    contactStorage.createContactArgs = createContactArgs;

    const __setContact = contactStorage._setContact.bind(contactStorage);
    contactStorage._setContact = _setContact;

    function _setContact(contactArgs, saveToStorage, cb){

        __setContact(contactArgs, saveToStorage, (err, out)=>{

            if (err) return cb(err);
            contactStorage._kademliaNode.contact.allowRelay = true;
            cb(null, out);

        })

    }

    async function createContactArgs ( opts ){

        if (opts.contactType === undefined)
            opts.contactType = ContactType.CONTACT_TYPE_DISABLED;

        const out = await _createContactArgs(opts);

        return {
            ...out,
            args: [
                ...out.args,
                opts.contactType,
            ]
        }
    }

}