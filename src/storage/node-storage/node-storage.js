const level = require('level');

module.exports = class NodeStorage {

    constructor(name) {
        this._db = level(name);
    }

    static supported(){
        return {
            result: true,
            type: "indexdb",
        }
    }

    clear(cb){
        return this._store.clear(cb)
    }

    removeItem(key, callback) {
        return this._store.del(key, callback)
    }

    setItem(key, value, callback) {
        return this._store.put(key, value, callback)
    }

    getItem(key, callback) {
        return this._store.get(key, callback)
    }

    iterator(cb) {
        return this._store.iterator(cb)
    }

}