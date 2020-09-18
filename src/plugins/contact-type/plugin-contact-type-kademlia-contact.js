const ContactType = require('../contact-type/contact-type')

module.exports = function(options) {

    return class MyContact extends options.Contact {

        constructor() {

            super(...arguments)

            this._contactType = arguments[this._argumentIndex++];
            if (!ContactType._map[this._contactType]) throw "Contact Server Type"

            this._keys.push('contactType');

        }

        get contactType(){
            return this._contactType;
        }

        set contactType(newValue){
            this._contactType = newValue;
        }

    }

}