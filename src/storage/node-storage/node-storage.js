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

    clear(){
        return this._db.clear()
    }

    removeItem(key) {
        return this._db.del(key)
    }

    setItem(key, value) {
        return this._db.put(key, value)
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
        return this._db.iterator()
    }

}