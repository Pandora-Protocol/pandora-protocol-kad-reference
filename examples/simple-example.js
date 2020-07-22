const KAD = require('./../index');
const async = require('async');

KAD.init({});

console.log("Simple KAD");

KAD.plugins.PluginKademliaNodeMock.initialize();
KAD.plugins.PluginKademliaNodeHTTP.initialize();
KAD.plugins.PluginKademliaNodeWebSocket.initialize();

//const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK;
//const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;

//addresses
const contacts = [ [
        0,
        Buffer.from('e055e2c4526e496050c39f0a6cb5c3a2c367d9b3831dd65ea423927903f6b9b2', 'hex'),
        protocol,
        '127.0.0.1',
        8000,
        '',
    ], [
        0,
        Buffer.from('909b9194acca9d309e7557e228f0d82dd9e05fcd4e02d0354a8ccb83649d001f', 'hex'),
        protocol,
        '127.0.0.1',
        8001,
        '',
    ], [
        0,
        Buffer.from('6680ee39806e5c86c3329c39b1b70f5d1e074b7fc5eda8bd6b64bb725b20b3fe', 'hex'),
        protocol,
        '127.0.0.1',
        8002,
        '',
    ], [
        0,
        Buffer.from('55a0f68d2de071171d9e0bb5373e5cc89a4a78b3a313f2e818029d59745364b6', 'hex'),
        protocol,
        '127.0.0.1',
        8003,
        '',
    ], [
        0,
        Buffer.from('b3e6ce9aa1735d9811e23b3d67ff91db0c0e911fc54f1f7d58f58a6ef4de748d', 'hex'),
        protocol,
        '127.0.0.1',
        8004,
        '',
    ], [
        0,
        Buffer.from('278e85ae39e1b36a508c5e2994177fc60f37a9d78e2bf21169d75fcee62547cd', 'hex'),
        protocol,
        '127.0.0.1',
        8005,
        '',
    ]
]

function newStore(){
    return new KAD.StoreMemory();
}

//creating kad nodes
const nodes = contacts.map(
    contact => new KAD.KademliaNode(
        [
            KAD.plugins.PluginKademliaNodeMock.plugin,
            KAD.plugins.PluginKademliaNodeHTTP.plugin,
            KAD.plugins.PluginKademliaNodeWebSocket.plugin,
        ],
        contact,
        newStore()
    ) )

nodes.map( it => it.start() );

//encountering
const connections = [[0,1],[0,2],[1,2],[1,4],[2,3],[2,4],[4,5]];
async.eachLimit( connections, 1, ( connection, next) =>{

    nodes[connection[0]].bootstrap( nodes[ connection[1] ].contact, false, ()=>{

        console.log("BOOTSTRAPING...");
        //fix for websockets
        setTimeout( ()=>{
            next()
        }, 200 );

    } );

}, (err, out)=> {

    let query = KAD.helpers.BufferUtils.genBuffer(global.KAD_OPTIONS.NODE_ID_LENGTH );
    nodes[4].crawler.iterativeFindValue( Buffer.alloc(0), query, (err, out)=>{
        console.log("iterativeFindValue", out);
    })

    let query2 = KAD.helpers.BufferUtils.genBuffer(global.KAD_OPTIONS.NODE_ID_LENGTH );
    nodes[3].crawler.iterativeStoreValue( Buffer.alloc(0), query2, 'query2', (err, out)=>{
        console.log("iterativeStoreValue", out);

        nodes[5].crawler.iterativeFindValue( Buffer.alloc(0), query2, (err, out)=>{
            console.log("iterativeFindValue2", out);
        })

    })

});

global.NODES = nodes;
