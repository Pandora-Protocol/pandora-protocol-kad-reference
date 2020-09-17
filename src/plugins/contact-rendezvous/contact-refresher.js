module.exports = class ContactRefresher {

    constructor(kademliaNode) {
        this._kademliaNode = kademliaNode;
        this._updateId = 0;
    }

    async refreshContact(){

        const updateId = this._updateId = new Date().getTime();

        const contacts = this._kademliaNode.routingTable.array.map(it => it.contact);

        return Promise.mapLimit( contacts.map( contact => this._refreshContactUpdate.bind(this, contact, updateId) ), KAD_OPTIONS.ALPHA_CONCURRENCY )

    }

    async _refreshContactUpdate(contact, updateId){

        if (updateId !== this._updateId)
            throw 'Changed';

        return this._kademliaNode.rules.sendUpdateContact(contact);

    }

}