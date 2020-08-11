module.exports = function (contactStorage){

    const _createContactArgs = contactStorage.createContactArgs;
    contactStorage.createContactArgs = createContactArgs;

    async function createContactArgs ( opts ){

        if (!opts.mockId) opts.mockId = opts.out.mock.mockId;

        const out = await _createContactArgs(opts);

        return {
            ...out,
            args: [
                ...out.args,
                opts.mockId,
            ]
        };

    }


}