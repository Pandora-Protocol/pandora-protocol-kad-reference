const KademliaNode = require('./src/kademlia-node')
const Store = require('./src/store/store')
const StoreMemory = require('./src/store/store-memory')
const Config = require('./src/config')

const Storage = require('./src/storage/storage')

const Contact = require('./src/contact/contact')
const ContactAddressProtocolType = require('./src/plugins/contact-type/contact-address-protocol-type')

const RoutingTable = require('./src/routing-table/routing-table')

const PluginKademliaNodeMock = require('./src/plugins/node-mock/index')
const PluginKademliaNodeHTTP = require('./src/plugins/node-http/index')
const PluginKademliaNodeWebSocket = require('./src/plugins/node-websocket/index')
const PluginSortedList = require('./src/plugins/sorted-list/index')
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

const async = require('async');
const bencode = require('bencode');
const blobToBuffer = require('blob-to-buffer')

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
        StoreMemory,
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
        PluginKademliaNodeMock,
        PluginContactType,
        PluginKademliaNodeHTTP,
        PluginKademliaNodeWebSocket,
        PluginSortedList,
        PluginContactIdentity,
        PluginContactRendezvous,
        PluginReverseConnection,
        PluginContactEncrypted,
        PluginContactSpartacus,
        PluginContactSybilProtect,
    },

    library: {
        async,
        bencode,
        blobToBuffer,
    }

}
