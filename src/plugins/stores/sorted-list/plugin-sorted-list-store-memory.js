const RedBlackTree = require('pandora-protocol-red-black-tree-js');
const Validation = require('../../../helpers/validation')
const Utils = require('../../../helpers/utils')
const {setAsyncInterval, clearAsyncInterval} = require('../../../helpers/async-interval')

module.exports = function (options){

    return class MyStore extends options.Store{

        constructor(){

            super(...arguments)

            this._memorySortedList = {};
            this._memorySortedListExtra = {};

            this._memorySortedListKeyNodesMap = new Map();
            this._memoryExpirationSortedList = new Map();

        }

        getSortedList(table, masterKey){

            Validation.validateTable(table);
            Validation.validateKey(masterKey);

            const tree = this._memorySortedList[table.toString() + ':' + masterKey.toString('hex')];
            if (!tree) return undefined;

            const out = tree.toSortedArrayInverted('getValueKeyArray');
            for (let i=0; i < out.length; i++)
                out[i][0] = Buffer.from(out[i][0], 'hex');
            return out;
        }

        getSortedListKeyExtra(table, masterKey, key){

            Validation.validateTable(table);
            Validation.validateKey(masterKey);
            Validation.validateKey(key);

            return this._memorySortedListExtra[ table.toString() +':'+ masterKey.toString('hex') + ':' + key.toString('hex') ];
        }

        getSortedListKey(table, masterKey, key){

            Validation.validateTable(table);
            Validation.validateKey(masterKey);
            Validation.validateKey(key);

            const node = this._memorySortedListKeyNodesMap.get(table.toString() +':'+ masterKey.toString('hex') + ':' + key.toString('hex')  );
            if (!node) return undefined;

            return {
                value: node.value,
                score: key,
            };

        }

        putSortedList(table, masterKey, key, value, score, extra, expiry = KAD_OPTIONS.T_STORE_KEY_EXPIRY){

            Validation.validateTable(table);
            Validation.validateKey(masterKey);
            Validation.validateKey(key);
            Validation.validateStoreData(value);
            Validation.validateStoreScore(score);

            table = table.toString();
            masterKey = masterKey.toString('hex');
            key = key.toString('hex');

            let tree = this._memorySortedList[table + ':' + masterKey ],
                saveTree;

            if (!tree) {
                saveTree = true;
                tree = new RedBlackTree();
            }

            let node = this._memorySortedListKeyNodesMap.get(table +':'+ masterKey + ':' + key  );

            if (node) {

                //TODO optimization to avoid removing and inserting
                //TODO thus saving O(logN)
                tree.removeNode(node);
                this._memorySortedListKeyNodesMap.delete(table + ':' + masterKey + ':' + key);
                this._memoryExpirationSortedList.delete(table + ':' + masterKey + ':' + key);
                delete this._memorySortedListExtra [ table + ':' + masterKey + ':' + key];

            }

            if (tree.count > 1500 ){
                const min = tree.min(tree.root);
                if (score > min.key ) {
                    tree.removeNode(min);
                    this._memorySortedListKeyNodesMap.delete(table + ':' + masterKey + ':' + min.id);
                    this._memoryExpirationSortedList.delete(table + ':' + masterKey + ':' + min.id);
                    delete this._memorySortedListExtra[table + ':' + masterKey + ':' + min.id];
                }
            }

            node = tree.insert(score, value, key);
            this._memorySortedListKeyNodesMap.set(table + ':' + masterKey + ':' + key, node);
            this._memorySortedListExtra[table + ':' + masterKey + ':' + key] = extra;

            if (saveTree)
                this._memorySortedList[table + ':' + masterKey] = tree;

            this._memoryExpirationSortedList.set( table + ':' + masterKey + ':' + key, {
                node,
                time: new Date().getTime() + expiry,
            });

            return 1;

        }

        _delSortedList(table, masterKey, key){

            const foundNode = this._memorySortedListKeyNodesMap.get(table + ':' + masterKey + ':' + key );
            if (!foundNode) return 0;

            const tree = this._memorySortedList[table + ':' + masterKey];
            tree.removeNode(foundNode);

            if ( tree.isEmpty )
                delete this._memorySortedList[ table + ':' + masterKey];

            this._memorySortedListKeyNodesMap.delete(table + ':' + masterKey + ':' + key);
            this._memoryExpirationSortedList.delete(table + ':' + masterKey+':'+key);
            delete this._memorySortedListExtra[table + ':' + masterKey+':'+key];

            return 1;
        }

        iteratorSortedList(){
            return this._memorySortedListKeyNodesMap.entries();
        }

        _iteratorExpirationSortedList(){
            return this._memoryExpirationSortedList.entries();
        }


        start(){

            super.start(...arguments);

            delete this._expireOldKeysSortedListIterator;
            this._asyncIntervalExpireOldKeysSortedList = setAsyncInterval(
                this._expireOldKeysSortedList.bind(this),
                KAD_OPTIONS.T_STORE_GARBAGE_COLLECTOR - Utils.preventConvoy(5 * 1000)
            );

        }

        stop(){

            super.stop(...arguments);
            clearAsyncInterval(this._asyncIntervalExpireOldKeysSortedList);

        }

        async _expireOldKeysSortedList(){

            if (!this._expireOldKeysSortedListIterator)
                this._expireOldKeysSortedListIterator = this._iteratorExpirationSortedList();

            const itValue =  this._expireOldKeysSortedListIterator.next();
            if (itValue.value && !itValue.done){

                const {node,  time} = itValue.value[1];
                if (time < new Date().getTime() ){

                    const words = itValue.value[0].split(':');
                    await this._delSortedList( words[0], words[1], words[2] )
                }

            } else
                delete this._expireOldKeysSortedListIterator;

        }

    }


};
