const Store = require('./store')
const Validation = require ('./../helpers/validation')

module.exports = class StoreMemory extends Store{

    constructor(id ) {
        super("memory", id);

        this._masterKeys = new Map();

        this._keys = new Map();
        this._expiration = new Map();
    }

    iterator(){
        return this._keys.entries();
    }

    _iteratorExpiration(){
        return this._expiration.entries();
    }

    get(table = '', masterKey, cb){

        const err1 = Validation.checkStoreTable(table);
        const err2 = Validation.checkStoreKey(masterKey);
        if (err1 || err2) return cb(err1||err2);

        const map = this._masterKeys.get(table + ':'+ masterKey);
        if (!map) return cb(null, null);

        let out = {};
        for (const entry of map.entries() )
            out[entry[0].toString('hex')] = entry[1];

        cb( null, out );
    }

    put(table = '', masterKey, key, value, expiry = KAD_OPTIONS.T_STORE_KEY_EXPIRY, cb){

        const err1 = Validation.checkStoreTable(table);
        const err2 = Validation.checkStoreMasterKey(masterKey);
        const err3 = Validation.checkStoreKey(key);
        const err4 = Validation.checkStoreData(value);

        if (err1 || err2 || err3 || err4) return cb(err1||err2||err3||err4);

        let map = this._masterKeys[table+':'+masterKey], map2;

        if (!map ) {
            map = new Map();
            this._masterKeys.set( table + ':' + masterKey, map);
        }

        map.set( key, value );

        this._keys.set( table + ':'+masterKey+':'+key,  value);
        this._expiration.set( table + ':'+masterKey+':'+key,  expiry);

        cb(null, 1);

    }

    del(table = '', masterKey, key, cb){

        const err1 = Validation.checkStoreTable(table);
        const err2 = Validation.checkStoreKey(masterKey);
        const err3 = Validation.checkStoreKey(key);
        if (err1 || err2 || err3) return cb(err1||err2||err3);

        if (!this._keys.get( table + ':'+masterKey+':'+key)) return cb(null, 0);

        this._masterKeys[table+':'+masterKey].delete(key);

        if ( this._masterKeys[table+':'+masterKey].size === 0 )
            this._masterKeys.delete(table+':'+masterKey);

        cb(null, 1);
    }



}
