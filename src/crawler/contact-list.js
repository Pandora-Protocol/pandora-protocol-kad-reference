const BufferUtils = require('./../helpers/buffer-utils')
module.exports = class ContactList {

    /**
     * @constructor
     * @param {string} key - Lookup key for this operation
     * @param {Bucket~contact[]} contacts - List of contacts to initialize with
     */
    constructor(key, contacts = []) {
        this.key = key;

        this._contacts = [];
        this._contactsSet = new Set();

        this._contacted = new Set();
        this._active = new Set();

        this.add(contacts);
    }

    /**
     * @property {Bucket~contact} closest - The contact closest to the reference key
     */
    get closest() {
        return this._contacts[0];
    }

    /**
     * @property {Bucket~contact[]} active - Contacts in the list that are active
     */
    get active() {
        return this._contacts.filter(contact => this._active.has(contact));
    }

    /**
     * @property {Bucket~contact[]} uncontacted - Contacts in the list that have not been
     * contacted
     */
    get uncontacted() {
        return this._contacts.filter(contact => !this._contacted.has(contact));
    }

    /**
     * Adds the given contacts to the list
     * @param {Bucket~contact[]} contacts
     */
    add(contacts= []) {

        const added = [];

        for (const contact of contacts)
            if (!this._contactsSet.has( contact.identityHex ) ){
                this._contacts.push(contact);
                this._contactsSet.add(contact.identityHex);
                added.push(contact);
            }

        this._contacts.sort(this._identitySort.bind(this));

        return added;
    }

    /**
     * Marks the supplied contact as contacted
     * @param {Bucket~contact} contact
     */
    contacted(contact) {
        this._contacted.add(contact);
    }

    /**
     * Marks the supplied contact as active
     * @param {Bucket~contact} contact
     */
    responded(contact) {
        this._active.add(contact);
    }

    /**
     * @private
     */
    //TODO optimize getDistance
    _identitySort( contactA, contactB ) {
        return BufferUtils.compareKeyBuffers(
            BufferUtils.xorDistance(contactA.identity, this.key),
            BufferUtils.xorDistance(contactB.identity, this.key)
        );
    }

}