const async = require('async');

module.exports = class ContactRefresher {

    constructor(kademliaNode) {
        this._kademliaNode = kademliaNode;
        this._updateId = 0;
    }

    refreshContact(cb){

        this._updateId = new Date().getTime();
        const updateId = this._updateId;

        const contacts = this._kademliaNode.routingTable.array.map(it => it.contact);

        async.eachLimit( contacts, KAD_OPTIONS.ALPHA_CONCURRENCY,
            ( contact, next ) => {

                if (updateId !== this._updateId)
                    return next(new Error('Changed'));

                this._kademliaNode.rules.sendUpdateContact(contact, (err, out) => next() );
            },
            (err)=>{

                if (err) return cb(err);
                return cb(null);

            });

    }

}