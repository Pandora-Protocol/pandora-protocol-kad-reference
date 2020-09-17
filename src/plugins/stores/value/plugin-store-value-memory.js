const Store = require('../../../store/store')
const Validation = require ('../../../helpers/validation')
const {setAsyncInterval, clearAsyncInterval} = require('../../../helpers/async-interval')

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

        get(table, key){
            Validation.validateTable(table);
            Validation.validateKey(key);

            return this._keys.get(table.toString() + ':'+ key.toString('hex'));
        }

        hasKey(table, key){

            Validation.validateTable(table);
            Validation.validateKey(key);

            return this._keys.has(table.toString() + ':'+ key.toString('hex'));
        }

        getKey(table, key){

            Validation.validateTable(table);
            Validation.validateKey(key);

            return this._keys.get(table.toString() + ':'+ key.toString('hex'));
        }

        put(table, key, value, expiry = KAD_OPTIONS.T_STORE_KEY_EXPIRY ){

            Validation.validateTable(table);
            Validation.validateKey(key);
            Validation.validateStoreData(value);

            const id =  table.toString() + ':'+key.toString('hex');

            this._keys.set( id,  value);
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

            if (!this._keys.get( table+':'+key )) return 0;

            this._keys.delete(key);
            this._expiration.delete(key);

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
