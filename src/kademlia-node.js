const RoutingTable = require('./routing-table/routing-table')
const KademliaRules = require('./kademlia-rules')
const Crawler = require('./crawler/crawler')
const EventEmitter = require('events');
const Contact = require('./contact/contact')
const bencode = require('bencode');
const Store = require('./store/store')
const Storage = require('./storage/storage')
const ContactStorage = require('./contact/contact-storage')
const KademliaNodePlugins = require('./plugins/kademlia-node-plugins')
const ContactsMap = require('./contact/contacts-map')

module.exports = class KademliaNode extends EventEmitter {

    constructor( index = '', plugins = [], options = {}) {

        super();

        options = {
            Contact,
            Storage,
            ContactStorage,
            Store: Store,
            RoutingTable,
            Rules: KademliaRules,
            Crawler,
            ContactsMap,
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
        this.contactsMap = new options.ContactsMap(this);

        this._options = options;

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
    async bootstrap(contact, first ){
        return this.join(contact, first)
    }

    /**
     * Inserts the given contact into the routing table and uses it to perform
     * a find node for this node's identity,
     * then refreshes all buckets further than it's closest neighbor, which will
     * be in the occupied bucket with the lowest index
     */
    async join(contact, first = false ) {

        if (typeof contact === "string") contact = Buffer.from(contact, "hex");
        if (Buffer.isBuffer(contact)) contact = this.createContact( bencode.decode(contact)  );

        contact = this.contactsMap.updateContact(contact);
        this.routingTable.addContact(contact);

        try{

            const out = await this.crawler.iterativeFindNode( this.contact.identity );

            const bucketsClosest = this.routingTable.getBucketsBeyondClosest();
            if (bucketsClosest.length)
                this.routingTable.refresher.refresh( bucketsClosest[0].bucketIndex );

            if (!first && this.routingTable.count === 1){
                this.routingTable.removeContact( contact );
                throw "Failed to discover nodes";
            }
            else{
                this.emit('join', out );
                return out;
            }

        }catch(err){
            this.routingTable.removeContact( contact );
            this.emit('join', err );
            throw err;
        }

    }

    async initializeNode( opts ){

        let out = await this.contactStorage.loadContact( opts );

        if (!out) {
            const contactArgs = await this.contactStorage.createContactArgs( opts );
            out = await this.contactStorage.setContact( contactArgs, false, true );
        }

        this.rules.initContact(this.contact);
        return out;

    }

    createContact(arr, update = true){
        //used for bencode
        const contact = new this.Contact( ...[ this, ...arr] );
        return update ? this.contactsMap.updateContact(contact) : contact;
    }

}

