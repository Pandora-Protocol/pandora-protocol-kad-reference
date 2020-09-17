const localforage = require('localforage');

module.exports = class BrowserStorage {

    constructor(name) {

        this._store = localforage.createInstance({
            name: name,
            storeName: name,
        })

    }

    static supported(){
        const indexdb = localforage.supports(localforage.INDEXEDDB);
        if (indexdb) return {
            result: true,
            type: "indexdb",
        };

        const websql = localforage.supports(localforage.WEBSQL);
        if (websql) return {
            result: true,
            type: "websql",
        }

        const localstorage = localforage.supports(localforage.LOCALSTORAGE);
        if (localstorage) return {
            result: true,
            type: "localstorage",
        }

        return {
            result: false,
        }
    }

    clear(){
        return this._store.clear()
    }

    removeItem(key) {
        return this._store.removeItem(key)
    }

    setItem(key, value) {
        return this._store.setItem(key, value)
    }

    async getItem(key) {
        try{
            const out = await this._db.get(key);
            return out;
        }catch(err){
            return null;
        }
    }

    iterator() {
        const self = this;
        return {
            _index: -1,
            next: function () {
                this._index++;
            },
        }
    }


}