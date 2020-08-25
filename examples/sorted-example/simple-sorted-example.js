const KAD = require('./../../index');
const async = require('async');
const path = require('path')

KAD.init({});

console.log("Simple KAD");
const COUNT = 6;

// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK;
// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;

const array = new Array( COUNT ).fill(1).map( (it, i) => i )

//creating kad nodes
const nodes = array.map(
    (contact, index) => new KAD.KademliaNode(
        path.resolve( __dirname + '/_temp/' + index ),
        [
            KAD.plugins.PluginContactIdentity,
            KAD.plugins.PluginNodeMock,
            KAD.plugins.PluginContactType,
            KAD.plugins.PluginNodeHTTP,
            KAD.plugins.PluginNodeWebSocket,
            KAD.plugins.PluginSortedList,
            KAD.plugins.PluginContactRendezvous,
            KAD.plugins.PluginReverseConnection,
        ],
    ) )

async.eachLimit( array, 1, (index, next ) => {

    nodes[index].start( {port: 10000+index} ).then((out)=>{
        next(null, out)
    })

}, (err, out)=>{

    //encountering
    const connections = [[0,1],[0,2],[1,2],[1,4],[2,3],[2,4],[4,5]];
    async.eachLimit( connections, 1, ( connection, next) =>{

        nodes[connection[0]].bootstrap( nodes[ connection[1] ].contact, false, ()=>{

            console.log("BOOTSTRAPING...");
            //fix for websockets
            setTimeout( next, 100 );

        } );

    }, (err, out)=> {

        let treeKey = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH);
        let query = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH);

        nodes[4].crawler.iterativeFindSortedList(Buffer.alloc(0), treeKey, false, (err, out)=>{
            console.log("iterativeFindSortedList", out);
            if (out) console.error('ERROR. Answer should have been undefined')
        })

        let query2 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
        let query3 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
        let query4 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
        nodes[3].crawler.iterativeStoreSortedListValue( Buffer.alloc(0), treeKey, query2, 'query2_5', 5, (err, out)=>{
            console.log("iterativeStoreSortedListValue", out);

            nodes[1].crawler.iterativeStoreSortedListValue( Buffer.alloc(0), treeKey, query3, 'query2_2', 2, (err, out)=> {
                console.log("iterativeStoreSortedListValue", out);

                nodes[4].crawler.iterativeStoreSortedListValue( Buffer.alloc(0), treeKey, query4, 'query2_8', 8, (err, out)=> {
                    console.log("iterativeStoreSortedListValue", out);

                    nodes[5].crawler.iterativeFindSortedList( Buffer.alloc(0), treeKey, false, (err, out)=>{
                        console.log("iterativeFindSortedList", out);
                    })

                });


            });

        })

    });


})


