const Validation = require('./../../helpers/validation')
const bencode = require('bencode');
const Contact = require('./../../contact/contact')

module.exports = function (options) {

    return class MyRules extends options.Rules {

        constructor() {

            super(...arguments);

            this._commands.FIND_SORTED_LIST = this._findSortedList.bind(this);
            this._commands.STORE_SORTED_LIST_VALUE = this._storeSortedListValue.bind(this);

            this._allowedStoreSortedListTables = {
                '': (srcContact, data, ) => { return true },
            };

        }

        _storeSortedListValue(req, srcContact, [table, treeKey, key, value, score], cb){

            const fct = this._allowedStoreSortedListTables[table.toString('ascii')];
            if (!fct) return cb(new Error('Table is not allowed'));

            if (fct( srcContact, [table, treeKey, key, value, score]) )
                this._store.putSortedList(table.toString('hex'), treeKey.toString('hex'), key.toString('hex'), value, score, cb);
            else cb(null, 0 );

        }

        sendStoreSortedListValue(contact, [table, treeKey, key, value, score], cb){

            if (!this._allowedStoreSortedListTables[table.toString('ascii')])
                return cb(new Error('Table is not allowed'));

            this.send(contact,'STORE_SORTED_LIST_VALUE', [table, treeKey, key, value, score], cb)

        }


        /**
         * Same as FIND_NODE, but if the recipient of the request has the requested key in its store, it will return the corresponding value.
         * @param treeKey
         * @param cb
         */
        _findSortedList(req, srcContact, [table, treeKey], cb){

            this._store.getSortedList(table.toString('hex'), treeKey.toString('hex'), (err, out) => {
                //found the data
                if (out) cb(null, [ 1, out ] )
                else cb( null, [ 0, this._kademliaNode.routingTable.getClosestToKey(treeKey) ] )
            })

        }

        sendFindSortedList(contact, table, key, cb){
            this.send(contact, 'FIND_SORTED_LIST', [table, key], cb);
        }


        decodeSendAnswer(dstContact, command, data, decodedAlready = false){

            if (!decodedAlready && Buffer.isBuffer(data)) data = bencode.decode(data);

            if ( command === 'FIND_SORTED_LIST' ){

                if ( data[0] === 1){
                    for (let i=0; i < data[1].length; i++)
                        data[1][i][0] = data[1][i][0].toString();

                    return data;
                } else {
                    for (let i = 0; i < data[1].length; i++)
                        data[1][i] = this._kademliaNode.createContact( data[1][i] );

                    return data;
                }
            }

            return super.decodeSendAnswer(dstContact, command, data, true);
        }


    }


}