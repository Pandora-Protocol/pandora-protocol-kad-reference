const ContactServerType = require('../../contact/contact-server-type')

module.exports = function (contactStorage){

    const _createContactArgs = contactStorage.createContactArgs;
    contactStorage.createContactArgs = createContactArgs;

    function createContactArgs ( opts, cb){

        if (!opts.httpServer){

            opts.httpServer = {};
            if (opts.out.httpServer.natTraversal){
                opts.httpServer.contactServerType = ContactServerType.SERVER_TYPE_ENABLED;
                opts.httpServer.protocol = opts.out.httpServer.protocol;
                opts.httpServer.hostname = opts.out.httpServer.hostname;
                opts.httpServer.port = opts.out.httpServer.port;
                opts.httpServer.path = opts.out.httpServer.path;
            }else {
                opts.httpServer.contactServerType = ContactServerType.SERVER_TYPE_DISABLED;
            }
        }

        _createContactArgs(opts, (err, out )=>{

            out.args.push(opts.httpServer.contactServerType);

            if (opts.httpServer.contactServerType === ContactServerType.SERVER_TYPE_ENABLED ){
                out.args.push(opts.httpServer.protocol);
                out.args.push(opts.httpServer.hostname);
                out.args.push(opts.httpServer.port);
                out.args.push(opts.httpServer.path);
            }

            cb(null, {
                args: out.args,
            });

        })

    }


}