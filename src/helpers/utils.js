module.exports.preventConvoy = (timeout = 30 * 60 * 1000) => {
    return Math.ceil( Math.random() * timeout );
}