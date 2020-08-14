const ECCUtils = require('./../../helpers/ecc-utils')

module.exports = function (options){

    return class MyContactStorage extends options.ContactStorage {

        async createContactArgs ( opts ){

            if (!opts.publicKey) {
                const keyPair = ECCUtils.createPair();
                opts.publicKey = keyPair.publicKey;
                opts.privateKey = keyPair.privateKey;
            }

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

        _setContact( contactArgs, saveToStorage, cb){

            super._setContact(contactArgs, saveToStorage, (err, out)=>{

                if (err) return cb(err);
                this._kademliaNode._contact.privateKey = contactArgs.privateKey;

                cb(null, out);

            })

        }

    }

}