const KademliaNode = require('./src/kademlia-node')
const Config = require('./src/config')

const Store = require('./src/store/store')
const Storage = require('./src/storage/storage')

const Contact = require('./src/contact/contact')
const ContactAddressProtocolType = require('./src/plugins/contact-type/contact-address-protocol-type')

const RoutingTable = require('./src/routing-table/routing-table')

const PluginNodeMock = require('./src/plugins/node-mock/index')
const PluginNodeHTTP = require('./src/plugins/node-http/index')
const PluginNodeWebSocket = require('./src/plugins/node-websocket/index')
const PluginNodeWebRTC = require('./src/plugins/node-webrtc/index')
const PluginStoreValue = require('./src/plugins/stores/value/index')
const PluginStoreSortedList = require('./src/plugins/stores/sorted-list/index')
const PluginContactEncrypted = require('./src/plugins/contact-encrypted/index')
const PluginContactSpartacus = require('./src/plugins/contact-spartacus/index')
const PluginContactSybilProtect = require('./src/plugins/contact-sybil-protect/index')
const PluginContactRendezvous = require('./src/plugins/contact-rendezvous/index')
const PluginReverseConnection = require('./src/plugins/reverse-connection/index')
const PluginContactType = require('./src/plugins/contact-type/index')
const PluginContactIdentity = require('./src/plugins/contact-identity/index')

const BufferUtils = require('./src/helpers/buffer-utils')
const StringUtils = require('./src/helpers/string-utils')
const Validation = require('./src/helpers/validation')
const AsyncInterval = require('./src/helpers/async-interval')
const ECCUtils = require('./src/helpers/ecc-utils')
const CryptoUtils = require('./src/helpers/crypto-utils')
const Utils = require('./src/helpers/utils')

const bencode = require('bencode');
const blobToBuffer = require('blob-to-buffer')

Promise.mapLimit = async (funcs, limit) => {
    let results = [];
    await Promise.all(funcs.slice(0, limit).map(async (func, i) => {
        results[i] = await func();
        while ((i = limit++) < funcs.length) {
            results[i] = await funcs[i]();
        }
    }));
    return results;
};

module.exports = {

    init(config ={} ) {

        global.KAD_OPTIONS = Utils.mergeDeep(Config, config);

    },

    KademliaNode,
    RoutingTable,


    Contact,
    ContactAddressProtocolType,

    storage: {
        Storage,
        Store,
    },

    helpers:{
        BufferUtils,
        StringUtils,
        Validation,
        AsyncInterval,
        ECCUtils,
        CryptoUtils,
        Utils,
    },

    plugins: {
        PluginContactIdentity,
        PluginStoreValue,
        PluginStoreSortedList,
        PluginNodeMock,
        PluginContactType,
        PluginNodeHTTP,
        PluginNodeWebSocket,
        PluginContactRendezvous,
        PluginNodeWebRTC,
        PluginReverseConnection,
        PluginContactEncrypted,
        PluginContactSpartacus,
        PluginContactSybilProtect,
    },

    library: {
        bencode,
        blobToBuffer,
    }

}
