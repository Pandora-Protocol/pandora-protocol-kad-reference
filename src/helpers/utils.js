function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}


module.exports.preventConvoy = (timeout = 30 * 60 * 1000) => {
    return Math.ceil( Math.random() * timeout );
}

module.exports.mergeDeep = (target, ...sources) => {

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

}