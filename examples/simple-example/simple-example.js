const KAD = require('../../index');
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

async function execute(){

    for (let i=0; i < nodes.length; i++)
        await nodes[i].start({port: 10096 + i});

    for (let i=1; i < nodes.length; i++){
        const out = await nodes[i].bootstrap( nodes[0].contact, true );
        console.log("BOOTSTRAPING...", out.length);
    }

    for (let i=0; i < nodes.length; i++)
        console.log(i, nodes[i].routingTable.count, nodes[i].routingTable.array.map( it => it.contact.contactType ));

    let query = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
    let out = await nodes[4].crawler.iterativeFindValue( '', query);
    console.log("iterativeFindValue", out.result, out.length);

    let query2 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
    out = await nodes[3].crawler.iterativeStoreValue( '', query2, '',query2);

    console.log("iterativeStoreValue", out );

    out = await nodes[4].crawler.iterativeFindValue( '', query2);
    console.log("iterativeFindValue2_1", out.result);

    out = await nodes[5].crawler.iterativeFindValue( '', query2);
    console.log("iterativeFindValue2_2", out.result);

    out = await nodes[3].rules.sendPing(nodes[5].contact);
    console.log("reverse connection", out[0] === 1 );

}

global.NODES = nodes;
execute();