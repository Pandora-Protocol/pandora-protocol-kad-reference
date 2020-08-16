const ContactType = require('../contact-type/contact-type')

module.exports = function (options){

    return class ContactStorage extends options.ContactStorage{

        async createContactArgs ( opts ){

            if (opts.contactType === undefined) opts.contactType = ContactType.CONTACT_TYPE_DISABLED;
            if (opts.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS)
                opts.contactType = ContactType.CONTACT_TYPE_DISABLED;

            const out = await super.createContactArgs(opts);

            return {
                ...out,
                args: [
                    ...out.args,
                    opts.contactType,
                ]
            }
        }

    }

}