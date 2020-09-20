const BufferUtils = require('./../../../helpers/buffer-utils')

const map = {};

module.exports = function (options){

    return class SybilProtectSignerBrowser extends options.SybilProtectSignerBase {

        constructor() {
            super();
            window.addEventListener("message", this.sybilCallback, false);
        }

        sybilCallback (event){

            if (!event || !event.data) return;
            const out = event.data;

            const array = map[event.origin];
            if ( array )
                for (let i=0; i < array.length; i++ )
                    if (array[i].data.message === out.data.message ){
                        array[i].resolve(out.out);
                        break;
                    }


        }

        openWindow ({origin, uri,  message, resolve, reject}){

            const w = window.open(uri);

            if (w && w.window)
                w.window.addEventListener("onload", function (){

                    w.window.addEventListener("onunload", function (){


                    });

                });

        }

        closeWindow ( origin, obj ){

            const array = map[origin];
            if (array.indexOf(obj) >= 0)
                array.splice(array.indexOf(obj), 1)

            if (this.onCloseWindow)
                this.onCloseWindow(obj);
        }

        signNow (origin, uri, data = {}, params = {}){

            const finalUri = uri + encodeURIComponent( JSON.stringify({ data: BufferUtils.serializeBuffers(data), params: BufferUtils.serializeBuffers(params) }) );

            let resolve, reject;

            const promise = new Promise((res, rej)=>{
                resolve = res;
                reject = rej;
            })

            if (!map[origin]) map[origin] = [];
            const array = map[origin];
            const obj = {
                uri: finalUri,
                data,
                params,
                resolve,
                reject
            };

            array.push(obj);

            promise.then( out => this.closeWindow(origin, obj) )
                .catch( e => this.closeWindow(origin, obj) )

            this.openWindow({origin, uri: finalUri, resolve, reject});

            return promise;
        }


    }

}


