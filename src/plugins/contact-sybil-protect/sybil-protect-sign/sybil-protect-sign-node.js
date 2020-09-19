const open = require('open');
const readlineUtils = require('./../../../helpers/readline-utils');
const BufferUtils = require('./../../../helpers/buffer-utils')

module.exports = function (options){

    return class SybilProtectSignNode extends options.SybilProtectSignBase {

        async signNow (origin, data = {}, params = {}){

            params.showOutput = true;
            const finalUri = origin + encodeURIComponent( JSON.stringify({ data: BufferUtils.serializeBuffers(data), params: BufferUtils.serializeBuffers(params) }) );

            console.info('Open', finalUri );

            open(finalUri);

            const input = await readlineUtils.readline('Paste the answer\n');
            if (typeof input !== "string" || !input.length)
                throw 'Input is not a string';

            return JSON.parse(input);
        }

    }
}
