const ContactType = require('../contact-relay/contact-type')

module.exports = function (options){

    return class ContactStorage extends options.ContactStorage{

        _setContact(contactArgs, saveToStorage, cb){

            super._setContact(contactArgs, saveToStorage, (err, out)=>{

                if (err) return cb(err);

                this._kademliaNode.contact.allowRelay = true;
                cb(null, out);

            })

        }

        async createContactArgs ( opts ){

            if (opts.contactType === undefined)
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