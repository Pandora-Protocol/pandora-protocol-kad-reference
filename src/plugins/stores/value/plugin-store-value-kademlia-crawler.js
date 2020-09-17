const Validation = require('../../../helpers/validation')

module.exports = function (options) {

    return class MyCrawler extends options.Crawler {

        constructor() {

            super(...arguments);

            this._methods.FIND_VALUE = {

                findMerge: (table, key, result, contact, method, finalOutputs) => {

                    const allowedTable = this._kademliaNode.rules._allowedStoreTables[table.toString()];
                    if ( finalOutputs.result && allowedTable.immutable ) return;

                    const data = allowedTable.validation(contact, allowedTable,[table, key, result], finalOutputs.result );
                    if (data) {
                        finalOutputs.result = {
                            value: data,
                            contact,
                        };
                        return true;
                    }

                }
            }

        }

        async iterativeFindValue(table, key){

            const allowedTable = this._kademliaNode.rules._allowedStoreTables[table.toString()];
            if (!allowedTable) throw 'Table is not allowed';

            if (typeof table === 'string') table = Buffer.from(table);
            if (typeof key === 'string') key = Buffer.from(key, 'hex');

            Validation.validateTable(table);
            Validation.validateKey(key);

            if (allowedTable.immutable){

                const out = await this._kademliaNode._store.get(table, key );
                if (out) return {result: {value: out, contact: this._kademliaNode.contact }, };

            }

            return this._iterativeFind( table,'FIND_VALUE', 'STORE', key, allowedTable.immutable);

        }

        async _iterativeStoreValue( data, method){

            const key = data[1];

            let stored = 0;
            const dispatchSendStore = async (contact) =>{
                try{
                    const out = await this._kademliaNode.rules[method]( contact, data);
                    if (out) stored += 1;
                }catch(err){

                }
            }

            const contacts = await this.iterativeFindNode( key );
            if (!contacts.length) return 0;

            await Promise.mapLimit( contacts.map( contact => dispatchSendStore.bind( this, contact) ), KAD_OPTIONS.ALPHA_CONCURRENCY);
            this._kademliaNode.routingTable.refresher.publishedByMe[key] = true;

            return stored;
        }

        async iterativeStoreValue(table, key, value){

            if (typeof table === 'string') table = Buffer.from(table);
            if (typeof key === 'string') key = Buffer.from(key, 'hex');
            if (typeof value === 'string') value = Buffer.from(value);

            const allowedTable = this._kademliaNode.rules._allowedStoreTables[table.toString()];
            if (!allowedTable) throw 'Table is not allowed';

            const out = await this._iterativeStoreValue(  [table, key, value], 'sendStore' );
            if (out)
                await this._kademliaNode._store.put( table, key, value, allowedTable.expiry );

            return out;
        }

    }

}