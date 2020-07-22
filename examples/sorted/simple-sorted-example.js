const KAD = require('./../../index');
const async = require('async');

KAD.init({});

console.log("Simple KAD");

KAD.plugins.PluginKademliaNodeMock.initialize();
KAD.plugins.PluginKademliaNodeHTTP.initialize();
const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;

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
            KAD.plugins.PluginSortedList.plugin,
        ],
        contact,
        newStore()
    ) )

nodes.map( it => it.start() );

//encountering
const connections = [[0,1],[0,2],[1,2],[1,4],[2,3],[2,4],[4,5]];
async.each( connections, ( connection, next) =>{
    nodes[connection[0]].bootstrap( nodes[ connection[1] ].contact, false, next );
}, (err, out)=> {

    let query = KAD.helpers.BufferUtils.genBuffer(global.KAD_OPTIONS.NODE_ID_LENGTH);
    nodes[4].crawler.iterativeFindSortedList('', query, (err, out)=>{
        console.log("iterativeFindSortedList", out);
        if (out) console.error('ERROR. Answer should have been undefined')
    })

    let query2 = KAD.helpers.BufferUtils.genBuffer(global.KAD_OPTIONS.NODE_ID_LENGTH );
    nodes[3].crawler.iterativeStoreSortedListValue( Buffer.alloc(0), query2, 'query2_5', 5, (err, out)=>{
        console.log("iterativeStoreSortedListValue", out);

        nodes[1].crawler.iterativeStoreSortedListValue( Buffer.alloc(0), query2, 'query2_2', 2, (err, out)=> {
            console.log("iterativeStoreSortedListValue", out);

            nodes[4].crawler.iterativeStoreSortedListValue( Buffer.alloc(0), query2, 'query2_8', 8, (err, out)=> {
                console.log("iterativeStoreSortedListValue", out);

                nodes[5].crawler.iterativeFindSortedList( Buffer.alloc(0), query2, (err, out)=>{
                    console.log("iterativeFindSortedList", out);
                })

            });


        });

    })

});
