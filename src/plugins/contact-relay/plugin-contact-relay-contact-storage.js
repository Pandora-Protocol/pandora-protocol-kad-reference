const ContactType = require('../contact-relay/contact-type')

module.exports = function (contactStorage){

    const _createContactArgs = contactStorage.createContactArgs;
    contactStorage.createContactArgs = createContactArgs;

    async function createContactArgs ( opts ){

        if (opts.contactType === undefined)
            opts.contactType = ContactType.CONTACT_TYPE_DISABLED;

        const out = await _createContactArgs(opts);

        out.args.push(opts.contactType);

        return out;
    }

}