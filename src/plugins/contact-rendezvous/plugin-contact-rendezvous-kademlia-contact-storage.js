const ContactType = require('../contact-type/contact-type')

module.exports = function (options){

    return class ContactStorage extends options.ContactStorage{

        async createContactArgs ( opts ){

            if (opts.contactType === ContactType.CONTACT_TYPE_RENDEZVOUS)
                opts.contactType = ContactType.CONTACT_TYPE_DISABLED;

            const out = await super.createContactArgs(opts);

            return {
                ...out,
                contactType: opts.contactType,
                args: [
                    ...out.args,
                ]
            }
        }

    }

}