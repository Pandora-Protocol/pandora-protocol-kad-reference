const {setAsyncInterval, clearAsyncInterval} = require('./helpers/async-interval')

module.exports = class KademliaRulesPending {

    constructor(kademliaRules) {

        this._kademliaRules = kademliaRules;
        this.list = {}
        this._counts = {};

    }

    async start(opts){

        this._asyncIntervalPending = setAsyncInterval(
            next => this._timeoutPending(next),
            KAD_OPTIONS.T_RESPONSE_TIMEOUT
        );

    }

    stop(){
        clearAsyncInterval(this._asyncIntervalPending);
    }

    pendingDelete(key){
        delete this.list[key];
        delete this._counts[key];
        if (this._counts[key] === 0){
            delete this.list[key];
            delete this._counts[key];
        }
    }

    pendingAdd(key, key2, timeout, resolve, time ){

        if (!this.list[key]) {
            this.list[key] = {};
            this._counts[key] = 0;
        }

        if (key2 === undefined) key2 = Math.random().toString() + '_' +  Math.random().toString();

        this.list[key][key2] = {
            key,
            key2,
            timeout,
            resolve,
            time,
            timestamp: new Date().getTime(),
        }

        this._counts[key] += 1;
    }

    pendingResolveAll(key, cb){

        const pending = this.list[key];
        if (!pending) return false;

        delete this.list[key];
        delete this._counts[key];

        try{
            for (const key2 in pending)
                cb ( pending[key2].resolve, key, key2 );
        }catch(err){
            console.error('pendingResolveAll', err);
        }

        return true;
    }

    pendingResolve(key, key2, cb){

        if (!this.list[key]) return false;
        if (!this.list[key][key2]) return false;

        try{
            cb(this.list[key][key2].resolve, key, key2);
        }catch(err){
            console.error('pendingResolve', err);
        }finally{

            delete this.list[key][key2];
            this._counts[key]--;

            if (this._counts[key] === 0){
                delete this.list[key];
                delete this._counts[key];
            }


        }


        return true;
    }

    pendingTimeoutAll(key, cb){

        const pending = this.list[key];
        if (!pending) return false;

        delete this.list[key];
        delete this._counts[key];

        try{
            for (const key2 in pending)
                cb( pending[key2].timeout );
        }catch(err){
            console.error('pendingTimeoutAll', err);
        }

        return true;
    }


    /**
     * Every T_RESPONSETIMEOUT, we destroy any open sockets that are still
     * waiting
     * @private
     */
    _timeoutPending(next) {

        const now = new Date().getTime();

        for (const key in this.list) {

            const pending = this.list[key];
            for (const key2 in pending){

                if (now >= pending[key2].timestamp + (pending[key2].time || KAD_OPTIONS.T_RESPONSE_TIMEOUT) ) {

                    const prev = pending[key2];

                    delete pending[key2];
                    this._counts[key]--;

                    try {
                        prev.timeout(  );
                    } catch (err) {
                        console.error("_timeoutPending raised an error", err);
                    }

                }

            }

            if ( this._counts[key] === 0 ) {
                delete this.list[key];
                delete this._counts[key];
            }


        }

        next(null)
    }

}