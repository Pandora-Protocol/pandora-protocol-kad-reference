const open = require('open');
const readlineUtils = require('./../../../helpers/readline-utils');
const BufferUtils = require('./../../../helpers/buffer-utils')

module.exports = function (options){

    return class SybilProtectSignerNode extends options.SybilProtectSignerBase {

        async signNow (origin, uri, data = {}, params = {}){

            params.showOutput = true;
            const finalUri = uri + encodeURIComponent( JSON.stringify({ data: BufferUtils.serializeBuffers(data), params: BufferUtils.serializeBuffers(params) }) );

            console.info('Open', finalUri );

            open(finalUri);

            const input = await readlineUtils.readline('Paste the answer\n');
            if (typeof input !== "string" || !input.length)
                throw 'Input is not a string';

            return JSON.parse(input);
        }

    }
}
