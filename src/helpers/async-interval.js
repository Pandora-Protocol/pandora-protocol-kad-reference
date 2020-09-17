const NextTick = require('./next-tick')

const map = {};

module.exports.setAsyncInterval = (func, time )=>{

    const id = Math.random().toString() + Math.random().toString() + Math.random().toString();
    const timeout = NextTick( ()=>processTimeout( id ), time );

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

async function processTimeout (id)  {
    try{

        if (!map[id] || map[id].done){
            delete map[id];
            return;
        }

        map[id].processing = true;

        const time = await map[id].func();

        if (!map[id] || map[id].done) {
            delete map[id];
            return;
        }

        map[id].processing = false;

        map[id].timeout = NextTick( () => processTimeout( id ), (time !== undefined) ? time : map[id].time );

    }catch(err){
        console.error("async interval raised an error", err);
    }
}
