const CryptoUtils = require('../../helpers/crypto-utils')
const ECCUtils = require('../../helpers/ecc-utils')

module.exports = function(kademliaNode) {

    if (!kademliaNode.plugins.hasPlugin('PluginContactSpartacus'))
        throw "PluginContactSpartacus is required";

    kademliaNode.plugins.contactPlugins.push({
        createInitialize,
        create,
    })

    function createInitialize(){
        this._spartacusNonceLength = 65;
    }

    function create(){

        this.getNonceMessage = getNonceMessage;

        const nonceMessage = this.getNonceMessage();

        const sybilPublicKeyIndex = this.nonce[0];
        if ( sybilPublicKeyIndex >= KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS.length) throw "Nonce invalid sybil public key index";
        const sybilPublicKey = KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[ sybilPublicKeyIndex ].publicKey;

        const sybilSignature = Buffer.alloc(64);
        this.nonce.copy(sybilSignature, 0, 1)

        if ( !ECCUtils.verifySignature( sybilPublicKey, nonceMessage, sybilSignature ))
            throw "Nonce is invalid";

    }

    function getNonceMessage (){

        const publicKey = this.publicKey;
        return CryptoUtils.sha256( publicKey );

    }

}