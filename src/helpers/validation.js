const ContactAddressProtocolType = require('../plugins/contact-type/contact-address-protocol-type')
const ECCUtils = require('./ecc-utils')
const MarshalUtils = require('./marshal-utils')
const CryptoUtils = require('./crypto-utils')

module.exports.validateProtocol = (protocol) => {
    if (!ContactAddressProtocolType._map[protocol]) throw "invalid protocol";
}

module.exports.validateHostname = (hostname) => {
    if (typeof hostname !== "string" || hostname.length < 5) throw "invalid Hostname";
}

module.exports.validatePath = (path) => {
    if (typeof path !== "string" || path.length > 10) throw "invalid Path";
}

module.exports.validatePort = (port) => {
    if (typeof port !== "number" || (port !== 80 && ( port < 1000 || port > 65535))) throw "invalid port";
}


module.exports.checkIdentity = (identity, text='Identity' ) => {
    if (!Buffer.isBuffer(identity)) return new Error(`${text} is not a buffer`);
    if (identity.length !== KAD_OPTIONS.NODE_ID_LENGTH) return new Error(`${text} length is invalid`);
}

module.exports.checkTable = (table ) => {
    if (!Buffer.isBuffer(table)) return new Error(`table is not a buffer`);
    if (table.length > 32) return new Error(`table length is invalid`);
}


module.exports.validateIdentity = (identity, text )=>{
    let err = module.exports.checkIdentity(identity, text);
    if (err) throw err;
}

module.exports.checkStoreTable = (table) => {
    if (typeof table !== "string" && table.length > 64 ) return new Error("Table is invalid");
}

module.exports.checkStoreMasterKey = (key) => {
    if (typeof key !== "string" || key.length !== KAD_OPTIONS.NODE_ID_LENGTH*2 ) return new Error("MasterKey is invalid");
    if (!/^[0-9a-f]+$/g.test(key)) return new Error(`Key is hex`);
}

module.exports.checkStoreKey = (key) => {
    if (typeof key !== "string" || !(!key.length || key.length === KAD_OPTIONS.NODE_ID_LENGTH*2 )) return new Error("Key is invalid");
    if (key && !/^[0-9a-f]+$/g.test(key)) return new Error(`Key is hex`);
}

module.exports.validateSybilProtectSignature = (sybilProtectIndex = 0, sybilProtectTime = 0, signature, message) =>{

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

}

module.exports.checkStoreData = (data) => {
    if ( !Buffer.isBuffer(data) || !data.length ) return new Error( "data is invalid" );
}

module.exports.checkStoreDataString = (data) => {
    if ( typeof data !== "string" || !data.length ) return new Error( "data is invalid" );
}

module.exports.checkStoreScore = ( data ) => {
    if (typeof data !== 'number' || data <= -Number.MAX_SAFE_INTEGER || data >= Number.MAX_SAFE_INTEGER ) return new Error( "data is invalid" );
}
