const KAD = require('../../index');
const path = require('path')

KAD.init({});
console.log("Large KAD");

// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK;
// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;

const COUNT = 1000;
const dataCount = 100;

//addresses
const contacts = [];
const array = new Array( COUNT ).fill(1).map( (it, i) => i )

const values = [];
for (let i=0; i < dataCount; i++)
    values.push({
        key: KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH ),
        value: KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH ).toString('hex')
    })

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

    await Promise.mapLimit( nodes.map( (node, index) => async () => {

        const out = await node.start( {hostname: '127.0.0.1', port: 10000+index} );
        console.log("START", 10000+index, nodes[index].contact.contactType );

    } ), 25 );

    const nodesList = [];

    let i=3, visited = {0: true, 1: true, 2: true};
    while (i < COUNT) {

        let index = Math.floor(Math.random() * COUNT);
        while (visited[index])
            index = Math.floor(Math.random() * COUNT);

        i++;

        visited[index] = true;
        nodesList.push( nodes[index] );

    }

    const outBootstrap = [], outStreams = [];

    await nodes[0].bootstrap( nodes[1].contact, true);
    await nodes[0].bootstrap( nodes[2].contact, true);

    await Promise.mapLimit( nodesList.map( node => async () => {

        const out = await node.bootstrap( nodes[0].contact, false);
        outBootstrap.push(out);
        console.log("joined already",  outBootstrap.length);

    }), 25);

    console.log("bootstrap finished ", outBootstrap.length );

    await Promise.mapLimit( values.map( value => async () => {

        const nodeIndex = Math.floor( Math.random() * contacts.length );
        const out = await nodes[nodeIndex].crawler.iterativeStoreValue( '', value.key, '', value.value);

        outStreams.push(out);

    }), 1);

    console.log("streams stored", outStreams )

}



execute();