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

        let done;
        eccrypto.encrypt(publicKey, message)
            .then( out => {
                if (!done) {
                    done = true;
                    cb(null, out)
                }
            } )
            .catch( err => {
                if (!done) {
                    done = true;
                    cb(err)
                }
            } )
    },

    decrypt(privateKey, message, cb){

        let done;

        eccrypto.decrypt( privateKey, message, )
            .then( out => {
                if (!done) {
                    done = true;
                    cb(null, out)
                }
            } )
            .catch( err => {
                if (!done) {
                    done = true;
                    cb(err)
                }
            } )
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