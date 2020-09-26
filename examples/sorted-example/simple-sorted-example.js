const KAD = require('./../../index');
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
            KAD.plugins.PluginStoreValue,
            KAD.plugins.PluginContactIdentity,
            KAD.plugins.PluginNodeMock,
            KAD.plugins.PluginContactType,
            KAD.plugins.PluginNodeHTTP,
            KAD.plugins.PluginNodeWebSocket,
            KAD.plugins.PluginStoreSortedList,
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
    console.log("iterativeFindSortedList", out);
    if (out) console.error('ERROR. Answer should have been undefined')

    let query2 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
    let query3 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
    let query4 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
    let query5 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );

    out = await nodes[3].crawler.iterativeStoreSortedListValue( '', masterKey, query2, 'query2_5', 5);
    console.log("iterativeStoreSortedListValue", out);

    out = await nodes[1].crawler.iterativeStoreSortedListValue( '', masterKey, query3, 'query2_2', 2);
    console.log("iterativeStoreSortedListValue", out);

    out = await nodes[4].crawler.iterativeStoreSortedListValue( '', masterKey, query4, 'query2_8', 8);
    console.log("iterativeStoreSortedListValue", out);

    out = await nodes[4].crawler.iterativeStoreSortedListValue( '', masterKey, query5, 'query2_10', 10);
    console.log("iterativeStoreSortedListValue", out);

    out = await nodes[5].crawler.iterativeFindSortedList( '', masterKey);
    console.log("iterativeFindSortedList", out);

    masterKey = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH);

    const n = 4*KAD_OPTIONS.PLUGINS.STORES.SORTED_LIST.MAX_SORTED_LIST_RETURN;
    for (let i=0; i < n; i++ ) {
        const query = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
        out = await nodes[4].crawler.iterativeStoreSortedListValue('', masterKey, query, 'query3_'+i.toString(), i);
        console.log("iterativeStoreSortedListValue", i, out)
    }

    let lastIndex = undefined;
    let i = n-1;
    while ( i > 10){
        out = await nodes[5].crawler.iterativeFindSortedList( '', masterKey, lastIndex );
        if (out.length !== KAD_OPTIONS.PLUGINS.STORES.SORTED_LIST.MAX_SORTED_LIST_RETURN) throw "out length is invalid";
        for (let j=0; j < out.length; j++) {
            if (out[j].score !== i)
                throw "score index is invalid"
            i--;
        }
        i++;
        console.log("iterativeFindSortedList", out.length);
        lastIndex = out[out.length-1].score;
    }

}

execute();