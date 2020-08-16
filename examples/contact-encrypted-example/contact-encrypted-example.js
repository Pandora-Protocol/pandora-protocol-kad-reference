const KAD = require('../../index');
const async = require('async');
const path = require('path')

console.log("Simple Encrypted Contact KAD");

const sybilKeys = {
    privateKey: Buffer.from("68a595199d55260b90d97e6714f27c2a22548f9ee4b2c61956eb628189a8e2ed", "hex"),
    publicKey: Buffer.from("049cf62611922a64575439fd14e0a1190c40184c4d20a1c7179828693d574e84b94b70c3f3995b7a2cd826e1e8ef9eb8ccf90e578891ecfe10de6a4dc9371cd19a", "hex"),
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
