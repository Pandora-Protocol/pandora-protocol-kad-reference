module.exports = function(options) {

    return class MyContact extends options.Contact {

        constructor() {

            super(...arguments);

            this.identity = arguments[this._argumentIndex++];
            this._keys.push( 'identity');

        }

    }

}