const ContactType = require('../contact-type/contact-type')

module.exports = function(options) {

    return class MyContact extends options.Contact {

        constructor() {

            super(...arguments)

            this.contactType = arguments[this._argumentIndex++];
            if (!ContactType._map[this.contactType]) throw "Contact Server Type"

            this._keys.push('contactType');
            this._allKeys.push('contactType');

        }

    }

}