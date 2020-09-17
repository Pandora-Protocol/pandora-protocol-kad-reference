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


async function execute(){

    for (let i=0; i < nodes.length; i++)
        await nodes[i].start({port: 10000 + i});

    for (let i=1; i < nodes.length; i++){
        const out = await nodes[i].bootstrap( nodes[0].contact, true );
        console.log("BOOTSTRAPING...", out.length);
    }

    for (let i=0; i < nodes.length; i++)
        console.log(i, nodes[i].routingTable.count, nodes[i].routingTable.array.map( it => it.contact.contactType ));

    let masterKey = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH);

    let out = await nodes[4].crawler.iterativeFindSortedList( '', masterKey);
    console.log("iterativeFindSortedList", out.result);
    if (out.result) console.error('ERROR. Answer should have been undefined')

    let query2 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
    let query3 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
    let query4 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );

    out = await nodes[3].crawler.iterativeStoreSortedListValue( '', masterKey, query2, 'query2_5', 5);
    console.log("iterativeStoreSortedListValue", out);

    out = await nodes[1].crawler.iterativeStoreSortedListValue( '', masterKey, query3, 'query2_2', 2);
    console.log("iterativeStoreSortedListValue", out);

    out = await nodes[4].crawler.iterativeStoreSortedListValue( '', masterKey, query4, 'query2_8', 8);
    console.log("iterativeStoreSortedListValue", out);

    out = await nodes[5].crawler.iterativeFindSortedList( '', masterKey);
    console.log("iterativeFindSortedList", out.result);

}

execute();