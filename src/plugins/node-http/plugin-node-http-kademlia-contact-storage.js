const ContactType = require('../contact-relay/contact-type')

module.exports = function (options){

    return class NewContactStorage extends options.ContactStorage{

        async createContactArgs ( opts ){

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

            const out = await super.createContactArgs(opts);

            out.args.push(opts.contactType);

            if (opts.contactType === ContactType.CONTACT_TYPE_ENABLED ){
                out.args.push(opts.httpServer.protocol);
                out.args.push(opts.httpServer.hostname);
                out.args.push(opts.httpServer.port);
                out.args.push(opts.httpServer.path);
            }

            return {
                ...out,
            };

        }

    }

}