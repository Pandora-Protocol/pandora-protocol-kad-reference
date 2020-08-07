const RoutingTable = require('./routing-table/routing-table')
const KademliaRules = require('./kademlia-rules')
const Crawler = require('./crawler/crawler')
const EventEmitter = require('events');
const KademliaNodePlugins = require('./plugins/kademlia-node-plugins')


const MemoryStore = require('./store/store-memory')
const Storage = require('./storage/storage')
const ContactStorage = require('./contact/contact-storage')

module.exports = class KademliaNode extends EventEmitter {

    constructor( index = '', plugins = [], options = {}) {

        super();

        this._index = index;

        this.plugins = new KademliaNodePlugins(this);

        this.storage = new (options.Storage || Storage)(index.toString());
        this._store = new (options.Store || MemoryStore)(index);

        this.contactStorage = new ContactStorage(this);

        this.routingTable = new RoutingTable(this);
        this.rules = new (options.KademliaRules || KademliaRules) ( this, this._store );
        this.crawler = new Crawler(this);

        this.plugins.install(plugins);


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

            if (err) {
                this.routingTable.removeContact( contact );
                this.emit('join', err);
                return cb(err, out);
            }

            const bucketsClosest = this.routingTable.getBucketsBeyondClosest();
            if (bucketsClosest.length)
                this.routingTable.refresher.refresh( bucketsClosest[0].bucketIndex, ()=> {
                });


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

        } );
    }

    initializeNode( opts, cb){

        this.contactStorage.loadContact( (err, out) =>{

            if (err) return cb(err);
            if (out) return cb(null, out);

            this.contactStorage.createContactArgs( opts, (err, contactArgs ) => {

                if (err) return cb(err);

                this.contactStorage.setContact( contactArgs, false, true, cb)

            } );

        });

    }

}

