const Store = require('../../../store/store')
const Validation = require ('../../../helpers/validation')


module.exports = function (options){

    return class MyStore extends options.Store {

        constructor() {

            super(...arguments)

            this._keys = new Map();
            this._expiration = new Map();

        }



        iterator(){
            return this._keys.entries();
        }

        _iteratorExpiration(){
            return this._expiration.entries();
        }

        get(table = '', key){
            Validation.validateStoreTable(table);
            Validation.validateStoreKey(key);

            return this._keys.get(table + ':'+ key);
        }

        hasKey(table = '', key){

            Validation.validateStoreTable(table);
            Validation.validateStoreKey(key);

            return this._keys.has(table + ':'+ key);
        }

        getKey(table = '', key){

            Validation.validateStoreTable(table);
            Validation.validateStoreKey(key);

            return this._keys.get(table + ':'+ key);
        }

        put(table = '', key, value, expiry = KAD_OPTIONS.T_STORE_KEY_EXPIRY ){

            Validation.validateStoreTable(table);
            Validation.validateStoreKey(key);
            Validation.validateStoreData(value);

            this._keys.set( table + ':'+key,  value);
            this._expiration.set( table + ':'+key, new Date().getTime() + expiry );

            return 1;
        }

        putExpiration(table='',  key,  expiry){

            Validation.validateStoreTable(table);
            Validation.validateStoreKey(key);

            this._expiration.set( table + ':'+key, new Date().getTime() + expiry);

            return 1;
        }

        del(table = '', key){

            Validation.validateStoreTable(table);
            Validation.validateStoreKey(key);

            if (!this._keys.get( table + ':'+key)) return 0;

            this._keys[table+':'+key].delete(key);
            this._expiration[table+':'+key].delete(key);

            return 1;
        }

    }


}
