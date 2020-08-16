const ContactRefresher = require('./contact-refresher')

module.exports = function (options){

    return class KademliaCrawler extends options.Crawler {

        constructor() {

            super(...arguments);

            this.contactRefresher = new ContactRefresher(this._kademliaNode);

        }

    }

}