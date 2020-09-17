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

    async encrypt(publicKey, message){
        return eccrypto.encrypt(publicKey, message)
    },

    async decrypt(privateKey, message){
        return eccrypto.decrypt( privateKey, message, );
    },

    sign(privateKey, msg){

        const out = eccrypto.sign(privateKey, msg);
        return out.length !== 64 ? undefined : out;

    },

    verify(publicKey, msg, sig){

        const out = eccrypto.verify( publicKey, msg, sig);
        if (out === true) return true;

        return false;
    }

}