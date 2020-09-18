const _map = {};

module.exports = {

    get(id){
        if (!id) throw "Invalid id";
        return _map[id];
    },

    resolve(id, data){

        if (!id) throw "Invalid id";

        const it = _map[id];
        if (it) {
            delete _map[id];
            it.resolve(data);
        }

    },

    reject(id, err ){
        if (!id) throw "Invalid id";

        const it = _map[id];
        if (it) {
            delete _map[id];
            it.reject(err);
        }
    },

    add(id, ms){

        if (!id) throw "Invalid id";

        const it = _map[id];
        if (it) return it.promise;

        let timeoutId;

        const promise = new Promise((resolve, err)=>{
            _map[id] = { resolve, err }
        })
        let finalPromise = promise;
        if (ms){
            const timeout = new Promise((resolve, reject) => {
                timeoutId = setTimeout(() => {
                    clearTimeout(timeoutId);
                    reject('Timed out in '+ ms + 'ms.')
                }, ms)
            })

            finalPromise = Promise.race([
                promise,
                timeout
            ])
        }

        _map[id].promise = finalPromise;

        finalPromise.then( () => {
            delete _map[id];
            clearTimeout(timeoutId);
        } );
        finalPromise.catch( () => {
            delete _map[id]
            clearTimeout(timeoutId);
        } );

        return _map[id];

    }

}