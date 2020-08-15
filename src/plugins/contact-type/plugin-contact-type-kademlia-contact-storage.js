const ContactType = require('./contact-type')

module.exports = function (options){

    return class NewContactStorage extends options.ContactStorage{

        async createContactArgs ( opts = {} ){

            if (!opts.contactType) opts.contactType = ContactType.CONTACT_TYPE_DISABLED;

            const out = await super.createContactArgs(opts);

            out.args.push(opts.contactType);

            return {
                contactType:  opts.contactType,
                ...out,
            };

        }

    }

}