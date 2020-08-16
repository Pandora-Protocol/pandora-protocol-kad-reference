const BufferUtils = require('./../../helpers/buffer-utils')

module.exports = function (options) {

    return class ContactStorage extends options.ContactStorage {

        async createContactArgs ( opts ){

            const out = await super.createContactArgs(opts);

            return {
                ...out,
                args: [
                    ...out.args,
                    opts.identity || BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH),
                ]
            }

        }


    }

}