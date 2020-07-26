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

    clear(cb){
        return this._store.clear(cb)
    }

    removeItem(key, callback) {
        return this._store.removeItem(key, callback)
    }

    setItem(key, value, callback) {
        return this._store.removeItem(key, value, callback)
    }

    getItem(key, callback) {
        return this._store.getItem(key, callback)
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