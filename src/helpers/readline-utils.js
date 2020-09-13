const rlp = require('readline');
const rl = rlp.createInterface({
    input: process.stdin,
    output: process.stdout
});

module.exports = {

    readline(title){
        return new Promise((resolve, reject) => {
            rl.question(title, (input) => resolve(input) );
        });
    }

}

