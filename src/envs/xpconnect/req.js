/*jslint */
/*global require, load */

(function () {
    'use strict';
    require._load = function (context, moduleName, url) {

        load(url);

        //Support anonymous modules.
        context.completeLoad(moduleName);
    };

}());
