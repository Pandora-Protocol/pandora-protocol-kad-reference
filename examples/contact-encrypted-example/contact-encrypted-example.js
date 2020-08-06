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
            SYBIL_PUBLIC_KEYS: [ sybilKeys.publicKey ],
        }
    }
});

KAD.plugins.PluginKademliaNodeMock.initialize();
KAD.plugins.PluginKademliaNodeHTTP.initialize();
KAD.plugins.PluginKademliaNodeWebSocket.initialize();

//const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK;
//const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;

const COUNT = 6;

//addresses
const array = new Array( COUNT ).fill(1).map( (it, i) => i )

//creating kad nodes
const nodes = array.map(
    (contact, index) => new KAD.KademliaNode(
        path.resolve( __dirname + '/_temp/' + index ),
        [
            KAD.plugins.PluginKademliaNodeMock.plugin,
            KAD.plugins.PluginKademliaNodeHTTP.plugin,
            KAD.plugins.PluginKademliaNodeWebSocket.plugin,
            KAD.plugins.PluginContactEncrypted.plugin,
            KAD.plugins.PluginContactSpartacus.plugin,
            KAD.plugins.PluginContactSybilProtect.plugin,
        ],
    ) )

async.eachLimit( array, 1, (index, next )=>{

    nodes[index].contactStorage.loadContact( (err, out) =>{

        if (!err) return next();

        const keyPair = KAD.helpers.ECCUtils.createPair();

        const sybilSignature = KAD.helpers.ECCUtils.sign( sybilKeys.privateKey, KAD.helpers.CryptoUtils.sha256( keyPair.publicKey ) );
        const nonce = Buffer.concat([
            Buffer.from("00", "hex"),
            sybilSignature,
        ]);

        const contact = nodes[index].contactStorage.createContactArgs( keyPair.privateKey, keyPair.publicKey, nonce, protocol, undefined, 8000+index )

        nodes[index].contactStorage.setContact( keyPair.privateKey, contact, true, true, next)

    } );


}, ()=>{

    nodes.map( it => it.start() );

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

        let query = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
        nodes[4].crawler.iterativeFindValue( Buffer.alloc(0), query, (err, out)=>{
            console.log("iterativeFindValue", out);
        })

        let query2 = KAD.helpers.BufferUtils.genBuffer(KAD_OPTIONS.NODE_ID_LENGTH );
        nodes[3].crawler.iterativeStoreValue( Buffer.alloc(0), query2, 'query2', (err, out)=>{
            console.log("iterativeStoreValue", out);

            nodes[5].crawler.iterativeFindValue( Buffer.alloc(0), query2, (err, out)=>{
                console.log("iterativeFindValue2", out);
            })

        })

    });

});

global.NODES = nodes;
