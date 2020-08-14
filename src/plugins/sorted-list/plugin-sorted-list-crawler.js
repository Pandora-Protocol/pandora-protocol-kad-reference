const Validation = require('./../../helpers/validation')

module.exports = function (options) {

    return class MyCrawler extends options.Crawler{

        iterativeFindSortedList(table, key, cb){

            const err1 = Validation.checkIdentity(key);
            const err2 = Validation.checkTable(table);
            if (err1 || err2) return cb(err1||err2);

            this._kademliaNode._store.getSortedList(table.toString('hex'), key.toString('hex'), (err, out)=>{

                if (out) return cb(null, {  result: out, contact: this._kademliaNode.contact });
                this._iterativeFind(table, 'FIND_SORTED_LIST', 'STORE_SORTED_LIST_VALUE', key, cb);

            });

        }

        iterativeStoreSortedListValue(table, key, value, score, cb){
            return this._iterativeStoreValue( [table, key, value, score], 'sendStoreSortedListValue', (data, next) => this._kademliaNode._store.putSortedList( table.toString('hex'), key.toString('hex'), value.toString('ascii'), score, next ), cb)
        }

    }

}