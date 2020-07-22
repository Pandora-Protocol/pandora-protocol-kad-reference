const RoutingTable = require('./routing-table/routing-table')
const KademliaRules = require('./kademlia-rules')
const Crawler = require('./crawler/crawler')
const EventEmitter = require('events');
const Contact = require('./contact/contact')
const KademliaNodePlugins = require('./plugins/kademlia-node-plugins')

module.exports = class KademliaNode extends EventEmitter {

    constructor( plugins = [], contactArgs = {}, store, options = {}) {

        super();

        this.plugins = new KademliaNodePlugins(this);

        this._store = store;
        this.routingTable = new RoutingTable(this);
        this.rules = new (options.KademliaRules || KademliaRules) (this, store);
        this.crawler = new Crawler(this);

        this.plugins.install(plugins);

        contactArgs.unshift( this );
        this._contact = new Contact(...contactArgs);
        this._contact.mine = true;

        this._started = false;
    }

    get contact(){
        return this._contact;
    }


    start() {
        if (this._started) throw "Already started";
        this.routingTable.start();
        this.rules.start();
        this.emit('status', true );
        this._started = true;
    }

    stop() {
        if (!this._started) throw "Already stopped";
        this.routingTable.stop();
        this.rules.stop();
        this.emit('status', false );
        this._started = false;
    }

    /**
     * Bootstrap by connecting to other known node in the network.
     */
    bootstrap(contact, first, cb = ()=>{} ){
        if (this.routingTable.map[ contact.identityHex ]) return cb(null, [] ); //already

        this.join(contact, first, cb)
    }

    /**
     * Inserts the given contact into the routing table and uses it to perform
     * a find node for this node's identity,
     * then refreshes all buckets further than it's closest neighbor, which will
     * be in the occupied bucket with the lowest index
     */
    join(contact, first = false, cb = ()=>{} ) {
        this.routingTable.addContact(contact);

        this.crawler.iterativeFindNode( this.contact.identity, (err, out)=>{

            if (err) return cb(err, out);

            this.routingTable.refresher.refresh(this.routingTable.getBucketsBeyondClosest().bucketIndex, ()=> {

                if (!first && this.routingTable.count === 1){
                    this.routingTable.removeContact( contact );

                    err = new Error("Failed to discover nodes")
                    this.emit('join', err );
                    return cb( err );

                }
                else{
                    this.emit('join', out );
                    cb(err, out);
                }

            })

        } );
    }



}

