const {setAsyncInterval, clearAsyncInterval} = require('./../helpers/async-interval')
const Utils = require('./../helpers/utils')

module.exports = class Store{

    constructor(type = "interface", id = 1) {
        this.id = id;
        this.type = "memory";
        this._started = false;
    }

    start(){
        if (this._started) throw "Store already started";

        delete this._expireOldKeysIterator;
        this._asyncIntervalExpireOldKeys = setAsyncInterval(
            this._expireOldKeys.bind(this),
            KAD_OPTIONS.T_STORE_GARBAGE_COLLECTOR - Utils.preventConvoy(5 * 1000)
        );

        this._started = true;
    }

    stop(){
        if (!this._started) throw "Store already closed";

        clearAsyncInterval(this._asyncIntervalExpireOldKeys);

        this._started = false;
    }

    iterator(){
    }

    _iteratorExpiration(){
    }

    get(table = '', key){
        throw "interface";
    }

    put(table = '', key, value, expiry){
        throw "interface";
    }

    del(table = '', key){
        throw "interface";
    }

    //plugin
    use(plugin){
        if (!plugin || typeof plugin !== "function" ) throw "Invalid plugin";
        plugin(this);
    }

    async _expireOldKeys(){

        if (!this._expireOldKeysIterator)
            this._expireOldKeysIterator = this._iteratorExpiration();

        const itValue =  this._expireOldKeysIterator.next();
        if (itValue.value && !itValue.done){
            const time = itValue.value[1];
            if (time < new Date().getTime() ){
                const key = itValue.value[0].splice(0, itValue[0].length-4 );
                await this.del(key )
            }
        } else {
            delete this._expireOldKeysIterator;
        }

    }



}