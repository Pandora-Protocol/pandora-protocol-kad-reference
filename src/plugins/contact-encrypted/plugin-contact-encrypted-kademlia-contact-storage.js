const ECCUtils = require('./../../helpers/ecc-utils')

module.exports = function (options){

    return class MyContactStorage extends options.ContactStorage {

        async createContactArgs ( opts ){

            if (!opts.privateKey) {
                const keyPair = ECCUtils.createPair();
                opts.privateKey = keyPair.privateKey;
            }

            if (!opts.publicKey)
                opts.publicKey = ECCUtils.getPublicKey(opts.privateKey);

            const out = await super.createContactArgs( opts );
            return {
                ...out,
                privateKey: opts.privateKey,
                args: [
                    ...out.args,
                    opts.publicKey,
                ]
            }

        }

        async _setContact( contactArgs, saveToStorage){

            const out = await super._setContact(contactArgs, saveToStorage);

            this._kademliaNode._contact.privateKey = contactArgs.privateKey;

            return out;

        }

    }

}