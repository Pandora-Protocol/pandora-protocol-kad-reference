const async = require('async');

module.exports = class ContactRefresher {

    constructor(kademliaNode) {
        this._kademliaNode = kademliaNode;
        this._updateTimestamp = 0;
    }

    updateContact(cb){

        this._updateTimestamp = new Date().getTime();
        const updateTimestamp = this._updateTimestamp;

        const contacts = this._kademliaNode.routingTable.array().map(it => it.contact);

        async.eachLimit( contacts, KAD_OPTIONS.ALPHA_CONCURRENCY,
            ( contact, next ) => {

                if (updateTimestamp !== this._updateTimestamp)
                    return next(new Error('Changed'));

                this._kademliaNode.sendPing(contact, (err, out) => next() );
            },
            (err)=>{

                if (err) return cb(err);
                return cb(null);

            });

    }

}