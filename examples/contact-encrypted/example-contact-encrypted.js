const KAD = require('../../index');
const async = require('async');

KAD.init({});

console.log("Simple Encrypted Contact KAD");

KAD.plugins.PluginKademliaNodeMock.initialize();
KAD.plugins.PluginKademliaNodeHTTP.initialize();
KAD.plugins.PluginKademliaNodeWebSocket.initialize();

const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK;
//const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
//const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;

const COUNT = 6;

//addresses
const keyPairs = [];
for (let i=0; i < COUNT; i++) {
    const privateKey = KAD.helpers.ECCUtils.createPrivateKey();
    keyPairs[i] = {
        publicKey: KAD.helpers.ECCUtils.getPublicKey(privateKey),
        privateKey
    }
}

const contacts = [];
for (let i=0; i < COUNT; i++)
    contacts[i] = [
        0,
        Buffer.alloc( global.KAD_OPTIONS.NODE_ID_LENGTH ), //empty identity
        protocol,
        '127.0.0.1',
        8000+i,
        '',
        keyPairs[i].publicKey,
        KAD.helpers.BufferUtils.genBuffer( 64 ),
        Buffer.alloc(64), //empty signature
        true,
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
            KAD.plugins.PluginKademliaNodeWebSocket.plugin,
            KAD.plugins.PluginContactEncrypted.plugin,
            KAD.plugins.PluginContactSpartacus.plugin,
        ],
        contact,
        newStore()
    ) )

nodes.forEach( (it, index) => {
    it.contact.privateKey = keyPairs[index].privateKey
    it.contact.identity = it.contact.computeContactIdentity();
    it.contact.signature = it.contact.sign( );
    it.start()
} );

//encountering
const connections = [[0,1],[0,2],[1,2],[1,4],[2,3],[2,4],[4,5]];
async.eachLimit( connections, 1, ( connection, next) =>{

    nodes[connection[0]].bootstrap( nodes[ connection[1] ].contact, false, ()=>{

        console.log("BOOTSTRAPING...");
        //fix for websockets
        setTimeout( ()=>{
            next()
        }, 300 );

    } );

}, (err, out)=> {

    let query = KAD.helpers.BufferUtils.genBuffer(global.KAD_OPTIONS.NODE_ID_LENGTH );
    nodes[4].crawler.iterativeFindValue( Buffer.alloc(0), query, (err, out)=>{
        console.log("iterativeFindValue", out);
    })

    let query2 = KAD.helpers.BufferUtils.genBuffer(global.KAD_OPTIONS.NODE_ID_LENGTH );
    nodes[3].crawler.iterativeStoreValue( Buffer.alloc(0), query2, 'query2', (err, out)=>{
        console.log("iterativeStoreValue", out);

        nodes[5].crawler.iterativeFindValue( Buffer.alloc(0), query2, (err, out)=>{
            console.log("iterativeFindValue2", out);
        })

    })

});

global.NODES = nodes;
