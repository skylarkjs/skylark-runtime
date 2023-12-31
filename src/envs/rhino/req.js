/*global require: false, java: false, load: false */

(function () {
    'use strict';
    var req = require;
    req._load = function (context, moduleName, url) {

        load(url);

        //Support anonymous modules.
        context.completeLoad(moduleName);
    };

}());