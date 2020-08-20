const KAD = require('../../index');
const async = require('async');
const path = require('path')

console.log("Simple Encrypted Contact KAD");

//const out = KAD.helpers.ECCUtils.createPair();

const sybilKeys = {
    privateKey: Buffer.from("a19159851fcc0edfd00067de2d3565066b75733208cdd3032647b2db70a8a25379bc55860049bc29f2c5c986d639956bda51878c905d7d584a6bc44f53911b80", "hex"),
    publicKey: Buffer.from("79bc55860049bc29f2c5c986d639956bda51878c905d7d584a6bc44f53911b80", "hex"),
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
            KAD.plugins.PluginNodeMock,
            KAD.plugins.PluginContactType,
            KAD.plugins.PluginNodeHTTP,
            KAD.plugins.PluginNodeWebSocket,
            KAD.plugins.PluginContactEncrypted,
            KAD.plugins.PluginContactRendezvous,
            KAD.plugins.PluginReverseConnection,
            KAD.plugins.PluginContactSpartacus,
            KAD.plugins.PluginContactSybilProtect, //must be the last
        ],
    ) )

async.eachLimit( array, 1, (index, next ) => {

    nodes[index].start( {port: 10096+index} ).then((out)=>{
        console.log("BOOTSTRAPING...", nodes[index].contact.identityHex, nodes[index].contact.port );
        next(null, out)
    })

}, (err, out)=>{

    //encountering
    async.eachLimit( array.slice(1), 1, ( index, next) =>{

        nodes[index].bootstrap( nodes[ 0 ].contact, true, (err, out)=>{

            //fix for websockets
            setTimeout( next, 1 );

        } );

    }, (err, out)=> {

        for (let i=0; i < nodes.length; i++)
            console.log(i, nodes[i].routingTable.count, nodes[i].routingTable.array.map( it => it.contact.contactType ));

        const query = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
        nodes[4].crawler.iterativeFindValue( Buffer.alloc(0), query, (err, out)=>{
            console.log("iterativeFindValue", out.result, out.length);
        })

        const query2 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
        nodes[3].crawler.iterativeStoreValue( Buffer.alloc(0), query2, 'query2', (err, out)=>{
            console.log("iterativeStoreValue", out);

            nodes[5].crawler.iterativeFindValue( Buffer.alloc(0), query2, (err, out)=>{
                console.log("iterativeFindValue2", out.result);
            })

        })

    });

});

global.NODES = nodes;
