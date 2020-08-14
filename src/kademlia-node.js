const RoutingTable = require('./routing-table/routing-table')
const KademliaRules = require('./kademlia-rules')
const Crawler = require('./crawler/crawler')
const EventEmitter = require('events');
const Contact = require('./contact/contact')

const MemoryStore = require('./store/store-memory')
const Storage = require('./storage/storage')
const ContactStorage = require('./contact/contact-storage')
const KademliaNodePlugins = require('./plugins/kademlia-node-plugins')

module.exports = class KademliaNode extends EventEmitter {

    constructor( index = '', plugins = [], options = {}) {

        super();

        options = {
            Contact,
            Storage,
            ContactStorage,
            Store: MemoryStore,
            RoutingTable,
            Rules: KademliaRules,
            Crawler,
            ...options,
        }

        this.plugins = new KademliaNodePlugins(this)
        this.plugins.install(plugins, options);

        this.Contact = options.Contact;

        this._index = index;

        this.storage = new options.Storage (index.toString());
        this._store = new  options.Store(index);

        this.contactStorage = new options.ContactStorage(this);

        this.routingTable = new options.RoutingTable(this);
        this.rules = new options.Rules ( this, this._store );
        this.crawler = new options.Crawler(this);

        this._started = false;
        this._starting = false;
    }

    get contact(){
        return this._contact;
    }

    async start(opts = {}) {

        if (this._started || this._starting) throw "Already started";

        this._starting = true;
        const out = {
            ... ( await this.rules.start(opts) ),
            ... ( await this.routingTable.start(opts) ),
            node: true,
        }

        this.emit('status', true );

        this._starting = false;
        this._started = true;


        return this.initializeNode( {...opts, out} );

    }

    async stop() {
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
                this.routingTable.refresher.refresh( bucketsClosest[0].bucketIndex, ()=> { });

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

    async initializeNode( opts ){

        return new Promise((resolve, reject)=>{

            this.contactStorage.loadContact( opts, async (err, out) =>{

                if (err) return reject(err);
                if (out) {
                    this.rules.initContact(this.contact);
                    return resolve(out);
                }

                try{
                    const contactArgs = await this.contactStorage.createContactArgs( opts );
                    this.contactStorage.setContact( contactArgs, false, true, (err, out)=>{
                        if (err) return reject(err)

                        this.rules.initContact(this.contact);
                        resolve(out);

                    })

                }catch(err){
                    reject(err);
                }

            });

        })


    }

    createContact(arr){

        //used for bencode
        return new this.Contact( ...[ this, ...arr] );

    }

}

