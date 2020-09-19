const Store = require('../../../store/store')
const Validation = require ('../../../helpers/validation')
const {setAsyncInterval, clearAsyncInterval} = require('../../../helpers/async-interval')

module.exports = function (options){

    return class MyStore extends options.Store {

        constructor() {

            super(...arguments)

            this._keys = new Map();
            this._expiration = new Map();

            this._extra = {};

        }

        iterator(){
            return this._keys.entries();
        }

        _iteratorExpiration(){
            return this._expiration.entries();
        }

        get(table, key){
            Validation.validateTable(table);
            Validation.validateKey(key);

            return this._keys.get(table.toString() + ':'+ key.toString('hex'));
        }

        getKeyExtra(table, key){

            Validation.validateTable(table);
            Validation.validateKey(key);

            return this._extra[ table.toString() + ':'+ key.toString('hex') ];
        }

        getKey(table, key){

            Validation.validateTable(table);
            Validation.validateKey(key);

            return this._keys.get(table.toString() + ':'+ key.toString('hex'));
        }

        put(table, key, value, extra, expiry = KAD_OPTIONS.T_STORE_KEY_EXPIRY ){

            Validation.validateTable(table);
            Validation.validateKey(key);
            Validation.validateStoreData(value);

            const id =  table.toString() + ':'+key.toString('hex');

            this._keys.set( id,  value);
            if (extra)
                this._extra[id] = extra;

            this._expiration.set( id, new Date().getTime() + expiry );

            return 1;
        }

        putExpiration(table,  key,  expiry){

            Validation.validateTable(table);
            Validation.validateKey(key);

            this._expiration.set( table.toString() + ':'+key.toString('hex'), new Date().getTime() + expiry);

            return 1;
        }

        _del(table, key){

            const id = table+':'+key;

            if (!this._keys.get( id )) return 0;

            this._keys.delete(id);
            this._expiration.delete(id);
            delete this._extra[id];

            return 1;
        }

        start(){

            super.start(...arguments);

            delete this._expireOldKeysIterator;
            this._asyncIntervalExpireOldKeys = setAsyncInterval(
                this._expireOldKeys.bind(this),
                KAD_OPTIONS.T_STORE_GARBAGE_COLLECTOR - Utils.preventConvoy(5 * 1000)
            );

        }

        stop(){
            super.stop();
            clearAsyncInterval(this._asyncIntervalExpireOldKeys);
            this._started = false;
        }


        async _expireOldKeys(){

            if (!this._expireOldKeysIterator)
                this._expireOldKeysIterator = this._iteratorExpiration();

            const itValue =  this._expireOldKeysIterator.next();
            if (itValue.value && !itValue.done){
                const time = itValue.value[1];
                if (time < new Date().getTime() ){

                    const words = itValue.value[0].split(':');
                    await this._del( words[0], words[1] )

                }
            } else {
                delete this._expireOldKeysIterator;
            }

        }



    }


}
