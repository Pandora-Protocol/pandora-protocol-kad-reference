const ContactAddressProtocolType = require('./../contact/contact-address-protocol-type')

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
    if (typeof port !== "number" || port < 1000 || port > 65535) throw "invalid port";
}


module.exports.checkIdentity = (identity, text='Identity' ) => {
    if (!Buffer.isBuffer(identity)) return new Error(`${text} is not a buffer`);
    if (identity.length !== global.KAD_OPTIONS.NODE_ID_LENGTH) return new Error(`${text} length is invalid`);
}

module.exports.checkTable = (table ) => {
    if (!Buffer.isBuffer(table)) return new Error(`table is not a buffer`);
    if (table.length > 32) return new Error(`table length is invalid`);
}


module.exports.validateIdentity = (identity, text )=>{
    let err = module.exports.checkIdentity(identity, text);
    if (err) throw err;
}

module.exports.validateContactVersion = ( version  )=>{
    if (version !== 0) throw "Invalid Contact Version";
}

module.exports.checkStoreTable = (table) => {
    if (typeof table !== "string" && table.length > 64 ) return new Error("Table is invalid");
}

module.exports.checkStoreKey = (key) => {
    if (typeof key !== "string" || key.length !== global.KAD_OPTIONS.NODE_ID_LENGTH*2 ) return new Error("Key is invalid");
    if (!/^[0-9a-f]+$/g.test(key)) return new Error(`Key is hex`);
}

module.exports.checkStoreData = (data) => {
    if (typeof data !== 'string' || data.length === 0) return new Error( "data is invalid" );
}

module.exports.checkStoreScore = ( data ) => {
    if (typeof data !== 'number' || data <= -Number.MAX_SAFE_INTEGER || data >= Number.MAX_SAFE_INTEGER ) return new Error( "data is invalid" );
}
