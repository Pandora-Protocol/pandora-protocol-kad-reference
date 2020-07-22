const Store = require('./store')
const Validation = require ('./../helpers/validation')

module.exports = class StoreMemory extends Store{

    constructor() {
        super("memory");
        this._memory = new Map();
        this._memoryExpiration = new Map();
    }

    iterator(){
        return this._memory.entries();
    }

    _iteratorExpiration(){
        return this._memoryExpiration.entries();
    }

    get(table = '', key, cb){

        const err1 = Validation.checkStoreTable(table);
        const err2 = Validation.checkStoreKey(key);
        if (err1 || err2) return cb(err1||err2);

        cb( null, this._memory.get(table + ':'+ key) );
    }

    put(table = '', key, value, cb){

        const err1 = Validation.checkStoreTable(table);
        const err2 = Validation.checkStoreKey(key);
        const err3 = Validation.checkStoreData(value);
        if (err1 || err2 || err3) return cb(err1||err2||err3);

        this._memory.set( table + ':' + key, value );
        this._putExpiration(table, key, Date.now() + global.KAD_OPTIONS.T_STORE_KEY_EXPIRY, ()=>{
            cb( null, 1 );
        });

    }

    del(table = '', key, cb){

        const err1 = Validation.checkStoreTable(table);
        const err2 = Validation.checkStoreKey(key);
        if (err1 || err2) return cb(err1||err2);

        if (!this._memory.get(table + ':' + key))
            return cb(null, 0);
        else {
            this._memory.delete(table + ':' + key);
            this._delExpiration(table, key, ()=>{
                cb(null, 1)
            })
        }
    }


    //table, key already verified
    _getExpiration(table = '', key, cb){
        cb( null, this._memoryExpiration.get(table + ':' + key+':exp') );
    }

    //table, key already verified
    _putExpiration(table = '', key, time, cb){
        this._memoryExpiration.set(table + ':' + key+':exp', time);
        cb(null, 1);
    }

    //table, key already verified
    _delExpiration(table = '', key, cb){

        if (this._memoryExpiration.get(table + ':' + key)) {
            this._memoryExpiration.delete(table + ':' + key + ':exp');
            cb(null, 1)
        } else
            cb(null, 0);
    }

}
