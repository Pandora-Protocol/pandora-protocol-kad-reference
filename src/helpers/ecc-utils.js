const eccrypto = require("pandora-protocol-eccrypto");

module.exports =  {

    createPrivateKey(){
        return eccrypto.generatePrivate();
    },

    getPublicKey(privateKey){
        return Buffer.from( eccrypto.getPublic(privateKey) );
    },

    encrypt(publicKey, message, cb){
        eccrypto.encrypt(publicKey, message)
            .then( out => cb(null, out) )
            .catch( cb )
    },

    decrypt(privateKey, message, cb){
        eccrypto.decrypt( privateKey, message, )
            .then( out => cb(null, out) )
            .catch( cb )
    },

    sign(privateKey, msg){

        const out = eccrypto.sign(privateKey, msg);
        if (out.length !== 64) throw "invalid args";
        return out;

    },

    verifySignature(publicKey, msg, sig){

        try{
            const out = eccrypto.verify( publicKey, msg, sig);
            if (out === true) return true;
        }catch(err){

        }

        return false;
    }

}