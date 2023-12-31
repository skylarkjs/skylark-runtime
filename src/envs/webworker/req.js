//sloppy since eval enclosed with use strict causes problems if the source
//text is not strict-compliant.
/*jslint sloppy: true, evil: true */
/*global require, */

(function () {
    // Separate function to avoid eval pollution, same with arguments use.
    var req = require;

    req._nextTick = function (fn) {
        setTimeout(fn, 4);
    };
    
    req._load = function (context, moduleName, url) {
        try {
            //In a web worker, use importScripts. This is not a very
            //efficient use of importScripts, importScripts will block until
            //its script is downloaded and evaluated. However, if web workers
            //are in play, the expectation is that a build has been done so
            //that only one script needs to be loaded anyway. This may need
            //to be reevaluated if other use cases become common.
            importScripts(url);

            //Account for anonymous modules
            context.completeLoad(moduleName);
        } catch (e) {
            context.onError(makeError('importscripts',
                            'importScripts failed for ' +
                                moduleName + ' at ' + url,
                            e,
                            [moduleName]));
        }

    };
}());