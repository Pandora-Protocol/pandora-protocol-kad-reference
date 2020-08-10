module.exports = function (contactStorage){

    const _createContactArgs = contactStorage.createContactArgs;
    contactStorage.createContactArgs = createContactArgs;

    function createContactArgs ( opts, cb){

        if (!opts.mockId) opts.mockId = opts.out.mock.mockId;

        _createContactArgs(opts, (err, out )=>{

            cb(null, {
                args: [
                    ...out.args,
                    opts.mockId,
                ]
            });

        })

    }


}