const open = require('open');
const readlineUtils = require('./../../../helpers/readline-utils');

module.exports.initialize = function (){

}

module.exports.sign = async function (origin, uri, publicKey, message){

    open(uri+'/1');

    const input = await readlineUtils.readline('Paste the answer\n');
    if (typeof input !== "string" || !input.length)
        throw 'Input is not a string';

    return JSON.parse(input);
}