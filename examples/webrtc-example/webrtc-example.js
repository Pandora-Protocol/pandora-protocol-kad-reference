const KAD = require('../../index');
const path = require('path')

console.log("WebRTC KAD");

const sybilKeys = {
    publicKey: Buffer.from("049cf62611922a64575439fd14e0a1190c40184c4d20a1c7179828693d574e84b94b70c3f3995b7a2cd826e1e8ef9eb8ccf90e578891ecfe10de6a4dc9371cd19a", "hex"),
    uri: 'http://pandoraprotocol.ddns.net:9090/challenge/',
};

KAD.init({
    PLUGINS:{
        CONTACT_SYBIL_PROTECT: {
            SYBIL_PUBLIC_KEYS: [ sybilKeys ],
        }
    }
});

// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK;
// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;

const COUNT = 6;

//addresses
const array = new Array( COUNT ).fill(1).map( (it, i) => i )

//creating kad nodes
const nodes = array.map(
    (contact, index) => new KAD.KademliaNode(
        path.resolve( __dirname + '/_temp/' + index ),
        [
            KAD.plugins.PluginStoreValue,
            KAD.plugins.PluginNodeMock,
            KAD.plugins.PluginContactType,
            KAD.plugins.PluginNodeHTTP,
            KAD.plugins.PluginNodeWebSocket,
            KAD.plugins.PluginContactEncrypted,
            KAD.plugins.PluginContactRendezvous,
            KAD.plugins.PluginReverseConnection,
            KAD.plugins.PluginNodeWebRTC,
            KAD.plugins.PluginContactSpartacus,
            KAD.plugins.PluginContactSybilProtect, //must be the last
        ],
    ) )

async function execute(){

    for (let i=0; i < nodes.length; i++)
        await nodes[i].start({port: 10097 + i});

    for (let i=1; i < nodes.length; i++){
        const out = await nodes[i].bootstrap( nodes[0].contact, true );
        console.log("BOOTSTRAPING...", out.length);
    }

    const query = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
    let out = await nodes[4].crawler.iterativeFindValue( '', query);
    console.log("iterativeFindValue", out);

    const query2 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
    out = await nodes[3].crawler.iterativeStoreValue( '', query2,  'query2');
    console.log("iterativeStoreValue", out);

    out = await nodes[5].crawler.iterativeFindValue( '', query2);
    console.log("iterativeFindValue2", out);

    out = await nodes[4].rules.sendPing( nodes[5].contact ); //via webRTC
    console.log("ping out",  out);

    out = await nodes[5].rules.sendPing( nodes[4].contact );
    console.log("ping out",  out);

}


execute();
global.NODES = nodes;
