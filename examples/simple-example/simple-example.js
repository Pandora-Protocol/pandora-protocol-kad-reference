const KAD = require('../../index');
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
            KAD.plugins.PluginKademliaNodeMock,
            KAD.plugins.PluginKademliaNodeHTTP,
            KAD.plugins.PluginKademliaNodeWebSocket,
            KAD.plugins.PluginContactRelay,
        ],
    ) )

async.eachLimit( array, 1, (index, next ) => {

    nodes[index].start( {port: 10096+index} ).then((out)=>{
        next(null, out)
    })

}, (err, out)=>{

    //encountering
    const connections = [[0,1],[0,2],[1,2],[1,4],[2,3],[2,4],[5,4]];
    async.eachLimit( connections, 1, ( connection, next) =>{

        nodes[connection[0]].bootstrap( nodes[ connection[1] ].contact, false, ()=>{

            console.log("BOOTSTRAPING...");
            //fix for websockets
            setTimeout( next, 100 );

        } );

    }, (err, out)=> {

        let query = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
        nodes[4].crawler.iterativeFindValue( Buffer.alloc(0), query, (err, out)=>{
            console.log("iterativeFindValue", out);
        })

        let query2 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
        nodes[3].crawler.iterativeStoreValue( Buffer.alloc(0), query2, 'query2', (err, out)=>{
            console.log("iterativeStoreValue", out);

            nodes[4].crawler.iterativeFindValue( Buffer.alloc(0), query2, (err, out)=>{
                console.log("iterativeFindValue2", out);

                nodes[5].crawler.iterativeFindValue( Buffer.alloc(0), query2, (err, out)=>{
                    console.log("iterativeFindValue2", out);
                })

                nodes[3].rules.sendPing(nodes[5].contact,(err, out)=>{

                })

            })

        })

    });

});



global.NODES = nodes;
