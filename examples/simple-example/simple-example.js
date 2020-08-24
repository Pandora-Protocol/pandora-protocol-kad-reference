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
            KAD.plugins.PluginContactIdentity,
            KAD.plugins.PluginNodeMock,
            KAD.plugins.PluginContactType,
            KAD.plugins.PluginNodeHTTP,
            KAD.plugins.PluginNodeWebSocket,
            KAD.plugins.PluginContactRendezvous,
            KAD.plugins.PluginReverseConnection,
        ],
    ) )

async.eachLimit( array, 1, (index, next ) => {

    nodes[index].start( {port: 10096+index} ).then((out)=>{
        next(null, out)
    })

}, (err, out)=>{

    //encountering
    async.eachLimit( array.slice(1), 1, ( index, next) =>{

        nodes[index].bootstrap( nodes[ 0 ].contact, true, (err, out)=>{

            console.log("BOOTSTRAPING...", out.length);
            //fix for websockets
            setTimeout( next, 100 );

        } );

    }, (err, out)=> {

        for (let i=0; i < nodes.length; i++)
            console.log(i, nodes[i].routingTable.count, nodes[i].routingTable.array.map( it => it.contact.contactType ));

        let query = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
        nodes[4].crawler.iterativeFindValue( Buffer.alloc(0), query, true, (err, out)=>{
            console.log("iterativeFindValue", out.result, out.length);
        })

        let query2 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
        nodes[3].crawler.iterativeStoreValue( Buffer.alloc(0), query2, 'query2', (err, out)=>{
            console.log("iterativeStoreValue", out );

            nodes[4].crawler.iterativeFindValue( Buffer.alloc(0), query2, true, (err, out)=>{
                console.log("iterativeFindValue2_1", out.result);

                nodes[5].crawler.iterativeFindValue( Buffer.alloc(0), query2, true, (err, out)=>{
                    console.log("iterativeFindValue2_2", out.result);
                })

                nodes[3].rules.sendPing(nodes[5].contact,(err, out)=>{
                    console.log("reverse connection", out[0] === 1 );
                })

            })

        })

    });

});



global.NODES = nodes;
