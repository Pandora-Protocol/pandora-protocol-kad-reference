const eccrypto = require("pandora-protocol-eccrypto");

module.exports =  {

    createPair(){
        const privateKey = this.createPrivateKey();
        return {
            privateKey,
            publicKey: this.getPublicKey(privateKey),
        }
    },

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
        return out.length !== 64 ? undefined : out;

    },

    verify(publicKey, msg, sig){

        try{
            const out = eccrypto.verify( publicKey, msg, sig);
            if (out === true) return true;
        }catch(err){
            console.error("error verifying signature", err);
        }

        return false;
    }

}