const KAD = require('../../index');
const async = require('async');
const path = require('path')

KAD.init({});
console.log("Large KAD");

KAD.plugins.PluginKademliaNodeMock.initialize();
KAD.plugins.PluginKademliaNodeHTTP.initialize();
const protocol = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;

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
            KAD.plugins.PluginKademliaNodeMock.plugin,
            KAD.plugins.PluginKademliaNodeHTTP.plugin,
        ],
    ) )

async.eachLimit( array, 1, ( index, next ) => nodes[index].initializeNode( {protocol, address:'127.0.0.1', port: 10000+index }, next), ()=>{

    nodes.forEach(it => it.start());

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
    nodes[0].bootstrap( nodes[1].contact, true, ()=>{

        nodes[0].bootstrap( nodes[2].contact, true, () => {

            async.eachLimit( nodesList, 25, (node, next) =>{
                node.bootstrap( nodes[0].contact, false, (err, out) => {
                    outBootstrap.push(out);
                    console.log("joined already",  outBootstrap.length);
                    next(null, out)
                } );
            }, (err, out)=>{

                console.log("bootstrap finished ", outBootstrap.length );

                async.each( values, (value, next)=>{
                    const nodeIndex = Math.floor( Math.random() * contacts.length );
                    nodes[nodeIndex].crawler.iterativeStoreValue( Buffer.alloc(0), value.key, value.value, (err, out) => {
                        outStreams.push(out);
                        next(null, out)
                    } )
                }, (err, out)=>{

                    console.log("streams stored", outStreams )

                })

            } );


        })
    })

});


