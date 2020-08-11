const ContactType = require('../contact-relay/contact-type')

module.exports = function (contactStorage){

    const _createContactArgs = contactStorage.createContactArgs;
    contactStorage.createContactArgs = createContactArgs;

    async function createContactArgs ( opts ){

        if (!opts.httpServer){

            if (opts.out.httpServer && opts.out.httpServer.natTraversal){
                opts.contactType = ContactType.CONTACT_TYPE_ENABLED;
                opts.httpServer = {
                    protocol : opts.out.httpServer.protocol,
                    hostname : opts.out.httpServer.hostname,
                    port : opts.out.httpServer.port,
                    path : opts.out.httpServer.path,
                }
            }
        }

        const out = await _createContactArgs(opts);

        if (opts.contactType === ContactType.CONTACT_TYPE_ENABLED ){
            out.args.push(opts.httpServer.protocol);
            out.args.push(opts.httpServer.hostname);
            out.args.push(opts.httpServer.port);
            out.args.push(opts.httpServer.path);
        }

        return out;

    }


}