function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}


module.exports = {

    preventConvoy: function (timeout = 30 * 60 * 1000) {
        return Math.ceil( Math.random() * timeout );
    },

    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    mergeDeep: function (target, ...sources) {

        if (!sources.length) return target;
        const source = sources.shift();

        if (isObject(target) && isObject(source)) {
            for (const key in source) {
                if (isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.mergeDeep(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.mergeDeep(target, ...sources);

    },

    toArray(object, keys, keysFilter){

        const arr = [];
        for (const key of keys)
            if (!keysFilter[key]) {

                const it = object[key]

                if (Array.isArray(it) && it.length && typeof it[0] === "object" && it[0].toArray){

                    const v = it.map( it => it.toArray() );
                    arr.push(v);

                }else if (typeof it === "object" && it.toArray  ) {
                    const v = it.toArray();
                    arr.push(v);
                } else
                    arr.push(it)
            }

        return arr;

    },

    toJSON(object, keys, keysFilter, hex = false){
        const obj = {};

        for (const key of keys)
            if (!keysFilter[key]) {

                const it = object[key];

                if (Array.isArray(it) && it.length && typeof it[0] === "object" && it[0].toJSON){

                    const v = it.map( it => it.toJSON(hex) );
                    obj[key] = v;

                }else if (!Buffer.isBuffer(it) && typeof it === "object" && it.toJSON  ) {

                    obj[key] = it.toJSON(hex);

                } else {
                    obj[key] = it;
                    if (hex && Buffer.isBuffer(obj[key])) obj[key] = obj[key].toString( 'hex');
                }

            }

        return obj;
    }

}
