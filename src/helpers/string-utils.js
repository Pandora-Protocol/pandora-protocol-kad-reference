
module.exports = {

    genHexString(len) {
        const hex = '0123456789abcdef';
        let output = '';
        for (let i = 0; i < len; ++i) {
            output += hex.charAt(Math.floor(Math.random() * hex.length));
        }
        return output;
    },



}