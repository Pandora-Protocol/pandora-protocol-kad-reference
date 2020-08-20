const nacl = require('tweetnacl')

module.exports =  {

    createPair(){

        const keyPair = nacl.sign.keyPair()
        return {
            privateKey: Buffer.from(keyPair.secretKey),
            publicKey: Buffer.from(keyPair.publicKey)
        }
    },

    getPublicKey(privateKey){

        const keyPair = nacl.sign.keyPair.fromSecretKey(privateKey)

        return {
            privateKey: Buffer.from(keyPair.secretKey),
            publicKey: Buffer.from(keyPair.publicKey)
        }

    },

    encrypt( message, theirPublicKey, myPrivateKey ){

        const nonce = nacl.randomBytes(nacl.box.nonceLength)
        const data = nacl.box(message, nonce, theirPublicKey, myPrivateKey)
        return [
            Buffer.from(data),
            Buffer.from(nonce),
        ]
    },

    decrypt(message, nonce, theirPublicKey, myPrivateKey, ){
        const out = nacl.box.open( message, nonce, theirPublicKey, myPrivateKey)
        return out ? Buffer.from(out) : out;
    },

    sign(msg, privateKey){
        const out = nacl.sign.detached(msg, privateKey)
        return out ? Buffer.from(out) : out;
    },

    verifySignature(msg, signature, publicKey){
        return nacl.sign.detached.verify(msg, signature, publicKey);
    }

}