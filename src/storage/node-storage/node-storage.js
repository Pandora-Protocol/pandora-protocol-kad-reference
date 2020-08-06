const level = require('level');
const fs = require('fs')

module.exports = class NodeStorage {

    constructor(name) {

        if (!fs.existsSync(name))
            fs.mkdirSync(name);

        this._db = level(name);
    }

    static supported(){
        return {
            result: true,
            type: "indexdb",
        }
    }

    clear(cb){
        return this._db.clear(cb)
    }

    removeItem(key, callback) {
        return this._db.del(key, callback)
    }

    setItem(key, value, callback) {
        return this._db.put(key, value, callback)
    }

    getItem(key, callback) {
        return this._db.get(key, callback)
    }

    iterator(cb) {
        return this._db.iterator(cb)
    }

}