module.exports = function (options){

    return class NewStorage extends options.ContactStorage{

        async createContactArgs ( opts ){

            if (!opts.mockId) opts.mockId = opts.out.mock.mockId;

            const out = await super.createContactArgs(opts);

            return {
                ...out,
                args: [
                    ...out.args,
                    opts.mockId,
                ]
            };

        }


    }

}