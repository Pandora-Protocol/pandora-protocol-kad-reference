const bencode = require('bencode')

module.exports = class ContactStorage {

    constructor(kademliaNode) {
        this._kademliaNode = kademliaNode;
    }

    async loadContact( opts ){

        const out = await this._kademliaNode.storage.getItem('info:contact');
        if (!out) return null;

        const obj = bencode.decode( Buffer.from(out, 'base64') );
        const args = await this.createContactArgs({...opts, ...obj} );

        return this._setContact( args, false );

    }

    async _setContact(contactArgs, saveToStorage){

        this._kademliaNode._contact = this._kademliaNode.createContact( contactArgs.args );
        this._kademliaNode._contact.mine = true;

        if (saveToStorage) {
            delete contactArgs.args;
            delete contactArgs.out;
            await this._kademliaNode.storage.setItem('info:contact', bencode.encode(contactArgs).toString('base64') );
        }
        else
            return contactArgs;

    }

    async setContact( contactArgs, loadFromStorage = true, saveToStorage = true ){

        if (!loadFromStorage)
            return this._setContact( contactArgs, saveToStorage );

        const out =  await this.loadContact();
        if (out) return out;

        return this._setContact( contactArgs, saveToStorage );

    }

    createContactArgs( opts = {} ){
        return {
            args: [
                opts.app || KAD_OPTIONS.VERSION.APP,
                opts.version || KAD_OPTIONS.VERSION.VERSION,
            ]
        };
    }

}