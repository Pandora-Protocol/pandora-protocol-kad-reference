module.exports = {

    VERSION:{
        APP: "research",
        VERSION: "0.1014",
        VERSION_COMPATIBILITY: "0.101",
    },

    ALPHA_CONCURRENCY: 10, //ALPHA - Degree of parallelism

    NODE_ID_LENGTH: 32, // Number of bytes for nodeId, 20 bytes for 160 bits
    NODE_ID_EMPTY: Buffer.alloc(32),

    BUCKETS_COUNT_B: 256, //Number of bits for nodeID 160 bits

    BUCKET_COUNT_K: 20, // Number of contacts held in a bucket Number of nodes in a bucket

    T_BUCKETS_REFRESH: 3600000, //Interval for performing router refresh
    T_BUCKETS_REPLICATE: 3600000, // Interval for replicating local data

    T_REPLICATE_TO_NEW_NODE_EXPIRY: 60*60*1000,
    T_REPLICATE_TO_NEW_NODE_EXPIRY_CONVOY: 5*60*1000,
    T_REPLICATE_TO_NEW_NODE_SLEEP: 25,

    T_BUCKETS_REPUBLISH: 86400000, //Interval for republishing data

    T_STORE_KEY_EXPIRY: 60*60*1000, // Interval for expiring local data entries
    T_STORE_GARBAGE_COLLECTOR: 60*60*1000,
    T_STORE_GARBAGE_COLLECTOR_SLEEP: 25, //25 ms for iterator

    T_RESPONSE_TIMEOUT: 5000, //Time to wait for RPC response

    MAX_UNIMPROVED_REFRESHES: 3, // MAX_UNIMPROVED_REFRESHES - Quit refreshing no improvement

    TEST_PROTOCOL: '',

    PLUGINS: {

        CONTACT_RENDEZVOUS:{
            RENDEZVOUS_JOINED_MAX: 500,
            T_WEBSOCKET_DISCONNECT_RENDEZVOUS: 30*60*1000, //30 mins
        },

        NODE_WEBSOCKET:{
            MAX_TRANSFER_PAYLOAD_SIZE: 5 * 1024 * 1024, //5mb
            T_WEBSOCKET_DISCONNECT_INACTIVITY: 3*60*1000,
        },

        NODE_WEBRTC: {

            T_WEBRTC_DISCONNECT_INACTIVITY: 3*60*1000, //3 mins

            ICE_SERVERS: [

                {urls:"stun:stun.l.google.com:19302"},
                {urls:"stun:global.stun.twilio.com:3478?transport=udp"},

            ]

        },

        CONTACT_SPARTACUS: {
            T_CONTACT_TIMESTAMP_MAX_DRIFT: 60,
            T_CONTACT_TIMESTAMP_DIFF_UPDATE: 15,
        },

        CONTACT_SYBIL_PROTECT: {

            SYBIL_PUBLIC_KEYS: [

            ],

        },
    }

}