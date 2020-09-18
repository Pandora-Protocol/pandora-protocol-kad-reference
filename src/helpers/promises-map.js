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

        let it = _map[id];
        if (it) return it.promise;

        let timeoutId;

        const promise = new Promise((resolve, reject)=>{
            _map[id] = it = { resolve, reject };
        })
        if (ms){

            timeoutId = setTimeout(() => {
                clearTimeout(timeoutId);
                _map[id].reject('Timed out in '+ ms + 'ms.')
            }, ms)


        }

        it.promise = promise;

        promise.then( () => {
            clearTimeout(timeoutId);
            delete _map[id];
        } )
        .catch( () => {
            clearTimeout(timeoutId);
            delete _map[id]
        } );

        return _map[id];

    }

}