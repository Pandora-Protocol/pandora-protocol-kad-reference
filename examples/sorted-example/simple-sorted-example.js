const KAD = require('./../../index');
const async = require('async');
const path = require('path')

KAD.init({});

console.log("Simple KAD");
const COUNT = 6;

KAD.plugins.PluginKademliaNodeMock.initialize();
KAD.plugins.PluginKademliaNodeHTTP.initialize();
KAD.plugins.PluginKademliaNodeWebSocket.initialize();

//const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK;

const array = new Array( COUNT ).fill(1).map( (it, i) => i )

//creating kad nodes
const nodes = array.map(
    (contact, index) => new KAD.KademliaNode(
        path.resolve( __dirname + '/_temp/' + index ),
        [
            KAD.plugins.PluginKademliaNodeMock.plugin,
            KAD.plugins.PluginKademliaNodeHTTP.plugin,
            KAD.plugins.PluginKademliaNodeWebSocket.plugin,
            KAD.plugins.PluginSortedList.plugin,
        ],
    ) )

async.eachLimit( array, 1, (index, next )=> nodes[index].initializeNode( {protocol, port: 8000+index }, next), ()=>{

    nodes.map( it => it.start() );

    //encountering
    const connections = [[0,1],[0,2],[1,2],[1,4],[2,3],[2,4],[4,5]];
    async.eachLimit( connections, 1, ( connection, next) =>{

        nodes[connection[0]].bootstrap( nodes[ connection[1] ].contact, false, ()=>{

            console.log("BOOTSTRAPING...");
            //fix for websockets
            setTimeout( next, 100 );

        } );

    }, (err, out)=> {

        let query = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH);
        nodes[4].crawler.iterativeFindSortedList('', query, (err, out)=>{
            console.log("iterativeFindSortedList", out);
            if (out) console.error('ERROR. Answer should have been undefined')
        })

        let query2 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
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


})


