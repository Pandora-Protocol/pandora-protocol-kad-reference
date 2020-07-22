module.exports = {

    ALPHA_CONCURRENCY: 4, //ALPHA - Degree of parallelism

    NODE_ID_LENGTH: 32, // Number of bytes for nodeId, 20 bytes for 160 bits
    BUCKETS_COUNT_B: 256, //Number of bits for nodeID 160 bits

    BUCKET_COUNT_K: 20, // Number of contacts held in a bucket Number of nodes in a bucket

    T_BUCKETS_REFRESH: 3600000, //Interval for performing router refresh
    T_BUCKETS_REPLICATE: 3600000, // Interval for replicating local data

    T_REPLICATE_TO_NEW_NODE_EXPIRY: 60*60*1000,
    T_REPLICATE_TO_NEW_NODE_EXPIRY_CONVOY: 5*60*1000,
    T_REPLICATE_TO_NEW_NODE_SLEEP: 25,

    T_BUCKETS_REPUBLISH: 86400000, //Interval for republishing data

    T_STORE_KEY_EXPIRY: 86405000, // Interval for expiring local data entries
    T_STORE_GARBAGE_COLLECTOR: 10*60*3600,
    T_STORE_GARBAGE_COLLECTOR_SLEEP: 25, //25 ms for iterator

    T_RESPONSE_TIMEOUT: 10000, //Time to wait for RPC response

    MAX_UNIMPROVED_REFRESHES: 3, // MAX_UNIMPROVED_REFRESHES - Quit refreshing no improvement

}