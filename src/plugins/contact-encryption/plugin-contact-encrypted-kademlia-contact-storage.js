const ECCUtils = require('./../../helpers/ecc-utils')

module.exports = function (contactStorage){

    const _createContactArgs = contactStorage.createContactArgs;
    contactStorage.createContactArgs = createContactArgs;

    const __setContact = contactStorage._setContact.bind(contactStorage);
    contactStorage._setContact = _setContact;

    async function createContactArgs ( opts ){

        if (!opts.publicKey) {
            const keyPair = ECCUtils.createPair();
            opts.publicKey = keyPair.publicKey;
            opts.privateKey = keyPair.privateKey;
        }

        const out = await _createContactArgs( opts );
        return {
            publicKey: opts.publicKey,
            privateKey: opts.privateKey,
            args: [
                ...out.args,
                opts.publicKey,
            ]
        }

    }

    function _setContact( contactArgs, saveToStorage, cb){

        __setContact(contactArgs, saveToStorage, (err, out)=>{

            if (err) return cb(err);
            this._kademliaNode._contact.privateKey = contactArgs.privateKey;

            cb(null, out);

        })

    }

}