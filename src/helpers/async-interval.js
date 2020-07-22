const uuid = require('uuid').v1;
const NextTick = require('./next-tick')

const map = {};

module.exports.setAsyncInterval = (func, time )=>{

    const id = uuid();
    const timeout = NextTick( ()=>processTimeout( id), time );

    map[id] = {
        func,
        id,
        time,
        timeout,
        processing: false,
        done: false,
    }

    return id;
}

module.exports.clearAsyncInterval = (id) => {

    if (!map[id]) return;
    map[id].done = true;

}

const processTimeout = (id) => {
    try{

        if (!map[id] || map[id].done){
            delete map[id];
            return;
        }

        map[id].processing = true;
        map[id].func(()=>{

            if (!map[id] || map[id].done) {
                delete map[id];
                return;
            }
            map[id].processing = false;

            map[id].timeout = NextTick( ()=>processTimeout( id ), map[id].time );

        })


    }catch(err){
        console.error(err);
    }
}
