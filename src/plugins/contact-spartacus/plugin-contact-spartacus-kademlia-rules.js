module.exports = function (options){

    return class MyRules extends options.Rules {

        constructor() {
            super(...arguments);
        }

    }

}