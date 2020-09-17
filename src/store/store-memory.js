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

    get(table = '', masterKey){

        Validation.validateStoreTable(table);
        Validation.validateStoreKey(masterKey);

        const map = this._masterKeys.get(table + ':'+ masterKey);
        if (!map) return null;

        const out = [];
        for (const entry of map.entries() )
            out.push( [Buffer.from(entry[0], 'hex'), entry[1]]);

        return out;
    }

    hasKey(table = '', masterKey, key){
        Validation.validateStoreTable(table);
        Validation.validateStoreMasterKey(masterKey);
        Validation.validateStoreKey(key);

        return this._keys.has(table + ':'+ masterKey+':'+key);
    }

    getKey(table = '', masterKey, key){

        Validation.validateStoreTable(table);
        Validation.validateStoreMasterKey(masterKey);
        Validation.validateStoreKey(key);

        return this._keys.get(table + ':'+ masterKey+':'+key);
    }

    put(table = '', masterKey, key, value, expiry = KAD_OPTIONS.T_STORE_KEY_EXPIRY){

        Validation.validateStoreTable(table);
        Validation.validateStoreMasterKey(masterKey);
        Validation.validateStoreKey(key);
        Validation.validateStoreData(value);

        let map = this._masterKeys[table+':'+masterKey];

        if (!map ) {
            map = new Map();
            this._masterKeys.set( table + ':' + masterKey, map);
        }

        map.set( key, value );

        this._keys.set( table + ':'+masterKey+':'+key,  value);
        this._expiration.set( table + ':'+masterKey+':'+key, new Date().getTime() + expiry );

        return 1;
    }

    putExpiration(table='', masterKey, key,  expiry){

        Validation.validateStoreTable(table);
        Validation.validateStoreMasterKey(masterKey);
        Validation.validateStoreKey(key);

        this._expiration.set( table + ':'+masterKey+':'+key, new Date().getTime() + expiry);

        return 1;
    }

    del(table = '', masterKey, key){

        Validation.validateStoreTable(table);
        Validation.validateStoreKey(masterKey);
        Validation.validateStoreKey(key);

        if (!this._keys.get( table + ':'+masterKey+':'+key)) return 0;

        this._masterKeys[table+':'+masterKey].delete(key);

        if ( this._masterKeys[table+':'+masterKey].size === 0 )
            this._masterKeys.delete(table+':'+masterKey);

        return 1;
    }



}
