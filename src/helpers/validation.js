const ContactAddressProtocolType = require('../plugins/contact-type/contact-address-protocol-type')
const ECCUtils = require('./ecc-utils')
const MarshalUtils = require('./marshal-utils')
const CryptoUtils = require('./crypto-utils')

module.exports = {

    validateProtocol : (protocol) => {
        if (!ContactAddressProtocolType._map[protocol]) throw "invalid protocol";
    },

    validateHostname : (hostname) => {
        if (typeof hostname !== "string" || hostname.length < 5) throw "invalid Hostname";
    },

    validatePath : (path) => {
        if (typeof path !== "string" || path.length > 10) throw "invalid Path";
    },

    validatePort : (port) => {
        if (typeof port !== "number" || (port !== 80 && ( port < 1000 || port > 65535))) throw "invalid port";
    },


    validateIdentity : (identity, text='Identity' ) => {
        if (!Buffer.isBuffer(identity)) throw`${text} is not a buffer`;
        if (identity.length !== KAD_OPTIONS.NODE_ID_LENGTH)  throw `${text} length is invalid`;
    },

    validateTable : ( table ) => {
        if (!Buffer.isBuffer(table)) throw `table is not a buffer`;
        if (table.length > 32) throw `table length is invalid`;
    },

    validateStoreTable : (table) => {
        if (typeof table !== "string" && table.length > 64 ) throw"Table is invalid";
    },

    validateStoreKey : (key) => {
        if (typeof key !== "string" || key.length !== KAD_OPTIONS.NODE_ID_LENGTH*2 ) throw "MasterKey is invalid";
        if (!/^[0-9a-f]+$/g.test(key)) throw `Key is hex`;
    },

    validateSybilProtectSignature : (sybilProtectIndex = 0, sybilProtectTime = 0, signature, message) =>{

        if (sybilProtectIndex !== 0){

            if ( sybilProtectIndex > KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS.length) throw "Nonce invalid sybil public key index";
            const sybilPublicKey = KAD_OPTIONS.PLUGINS.CONTACT_SYBIL_PROTECT.SYBIL_PUBLIC_KEYS[ sybilProtectIndex-1 ].publicKey;

            if (sybilProtectTime){
                message = CryptoUtils.sha256( Buffer.concat( [
                    message,
                    MarshalUtils.marshalNumberFixed( sybilProtectTime, 7),
                ]) );
            }

            if ( !ECCUtils.verify( sybilPublicKey, message, signature ))
                throw "Nonce is invalid";

        } else {
            if (!signature.equals(KAD_OPTIONS.SIGNATURE_EMPTY)) throw "Nonce needs to be empty"
            if (sybilProtectTime !== 0) throw "Sybil Time has to be empty"
        }

    },

    validateStoreData : (data) => {
        if ( !Buffer.isBuffer(data) || !data.length ) throw "data is invalid" ;
    },

    validateStoreScore : ( data ) => {
        if (typeof data !== 'number' || data <= -Number.MAX_SAFE_INTEGER || data >= Number.MAX_SAFE_INTEGER ) throw "data is invalid" ;
    },

}

