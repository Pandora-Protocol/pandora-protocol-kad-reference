const ContactServerType = require('../../contact/contact-server-type')

module.exports = function (contactStorage){

    const _createContactArgs = contactStorage.createContactArgs;
    contactStorage.createContactArgs = createContactArgs;

    async function createContactArgs ( opts ){

        if (!opts.httpServer){

            if (opts.out.httpServer && opts.out.httpServer.natTraversal){
                opts.httpServer = {
                    contactServerType : ContactServerType.SERVER_TYPE_ENABLED,
                    protocol : opts.out.httpServer.protocol,
                    hostname : opts.out.httpServer.hostname,
                    port : opts.out.httpServer.port,
                    path : opts.out.httpServer.path,
                }
            }else {
                opts.httpServer = {
                    contactServerType : ContactServerType.SERVER_TYPE_DISABLED
                };
            }
        }

        const out = await _createContactArgs(opts);

        out.args.push(opts.httpServer.contactServerType);

        if (opts.httpServer.contactServerType === ContactServerType.SERVER_TYPE_ENABLED ){
            out.args.push(opts.httpServer.protocol);
            out.args.push(opts.httpServer.hostname);
            out.args.push(opts.httpServer.port);
            out.args.push(opts.httpServer.path);
        }

        return out;

    }


}