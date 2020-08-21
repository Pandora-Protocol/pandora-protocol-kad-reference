const RedBlackTree = require('pandora-protocol-red-black-tree-js');
const Validation = require('./../../helpers/validation')
const Utils = require('./../../helpers/utils')
const {setAsyncInterval, clearAsyncInterval} = require('./../../helpers/async-interval')

module.exports = function (options){

    return class MyStore extends options.Store{

        constructor(){

            super(...arguments)

            this._memorySortedList = new Map();
            this._memorySortedListKeyNodesMap = new Map();

            this._memoryExpirationSortedList = new Map();

        }

        getSortedList(table, key, cb){

            const err1 = Validation.checkStoreTable(table);
            const err2 = Validation.checkStoreKey(key);
            if (err1 || err2) return cb(err1||err2);

            const tree = this._memorySortedList.get(table + ':' + key);
            if (tree)
                cb( null, tree.toSortedArray('getValueKeyArray') );
            else
                cb( null, undefined );
        }

        putSortedList(table, key, value, score, cb){

            const err1 = Validation.checkStoreTable(table);
            const err2 = Validation.checkStoreKey(key);
            const err3 = Validation.checkStoreData(value);
            const err4 = Validation.checkStoreScore(score);
            if (err1 || err2 || err3||err4) return cb(err1||err2||err3||err4);

            let tree = this._memorySortedList.get(table + ':' + key);
            if (!tree) {
                tree = new RedBlackTree();
                this._memorySortedList.set(table + ':' + key, tree );
            }

            const foundNode = this._memorySortedListKeyNodesMap.get(table + ':' +key + ':' + value );
            if (foundNode) {

                if (foundNode.key === score)
                    return cb(null, 1);
                else {
                    //TODO optimization to avoid removing and inserting
                    //TODO thus saving O(logN)
                    tree.removeNode(foundNode);
                }

            }

            const newNode = tree.insert( score, value );
            this._memorySortedListKeyNodesMap.set(table + ':' +key+':'+value, newNode );

            this._putExpirationSortedList( table, key, { node: newNode, value, time: new Date().getTime() + KAD_OPTIONS.T_STORE_KEY_EXPIRY }, ()=>{
                cb(null, 1);
            });

        }

        delSortedList(table, key, value, cb){

            const err1 = Validation.checkStoreTable(table);
            const err2 = Validation.checkStoreKey(key);
            const err3 = Validation.checkStoreData(value);
            if (err1 || err2 || err3) return cb(err1||err2||err3);

            const foundNode = this._memorySortedListKeyNodesMap.get(table + ':' + key + ':' + value );
            if (!foundNode) return cb(null, 0);

            const tree = this._memorySortedList.get(table + ':' + key);
            tree.removeNode(foundNode);

            if ( tree.isEmpty )
                this._memorySortedList.delete( table + ':' + key );

            this._memorySortedListKeyNodesMap.delete(table + ':' + key+':'+value);
            this._delExpirationSortedList(table + ':' + key+':'+value, ()=>{
                cb(null, 1)
            });
        }


        //table, key already verified
        _getExpirationSortedList(table, key, cb){
            cb( null, this._memoryExpirationSortedList.get(table + ':' + key+':exp') );
        }

        //table, key already verified
        _putExpirationSortedList(table, key, { node, value, time }, cb){

            this._memoryExpirationSortedList.set( table + ':' + key +':exp', {
                node,
                value,
                time,
            });

            cb(null, 1);
        }

        //table, key already verified
        _delExpirationSortedList(table, key, cb){

            if (this._memoryExpirationSortedList.get(table + ':' +key)) {
                this._memoryExpirationSortedList.delete(table + ':' + key + ':exp');
                cb(null, 1)
            } else
                cb(null, 0);
        }


        iteratorSortedList(){
            return this._memorySortedListKeyNodesMap.entries();
        }

        _iteratorExpirationSortedList(){
            return this._memoryExpirationSortedList.entries();
        }


        start(){

            _start(...arguments);

            delete this._expireOldKeysSortedListIterator;
            this._asyncIntervalExpireOldKeysSortedList = setAsyncInterval(
                next => this._expireOldKeysSortedList(next),
                KAD_OPTIONS.T_STORE_GARBAGE_COLLECTOR + Utils.preventConvoy(5 * 60 * 1000)
            );

        }

        stop(){

            _stop(...arguments);

            clearAsyncInterval(this._asyncIntervalExpireOldKeysSortedList);
        }

        _expireOldKeysSortedList(next){

            if (!this._expireOldKeysSortedListIterator)
                this._expireOldKeysSortedListIterator = this._iteratorExpirationSortedList();

            const itValue =  this._expireOldKeysSortedListIterator.next();
            if (itValue.value && !itValue.done){

                const {node, value, time} = it.value[1];
                if (time < new Date().getTime() ){

                    const str = itValue.value[0].splice(0, itValue[0].length-4 );
                    const table = str.slice(0, str.indexOf(':') ) ;
                    const key = str.slice(str.indexOf(':')+1 );
                    this.delSortedList(table, key, value, next )
                }

            } else {
                delete this._expireOldKeysSortedListIterator;
                next()
            }

        }

    }


};
