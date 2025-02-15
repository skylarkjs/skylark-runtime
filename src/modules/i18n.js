define(['module'], function (module) {
    'use strict';

    //regexp for reconstructing the master bundle name from parts of the regexp match
    //nlsRegExp.exec('foo/bar/baz/nls/en-ca/foo') gives:
    //['foo/bar/baz/nls/en-ca/foo', 'foo/bar/baz/nls/', '/', '/', 'en-ca', 'foo']
    //nlsRegExp.exec('foo/bar/baz/nls/foo') gives:
    //['foo/bar/baz/nls/foo', 'foo/bar/baz/nls/', '/', '/', 'foo', '']
    //so, if match[5] is blank, it means this is the top bundle definition.
    var nlsRegExp = /(^.*(^|\/)nls(\/|$))([^\/]*)\/?([^\/]*)/;

    //Helper function to avoid repeating code. Lots of arguments in the
    //desire to stay functional and support RequireJS contexts without having
    //to know about the RequireJS contexts.
    function addPart(locale, master, needed, toLoad, prefix, suffix) {
        if (master[locale]) {
            needed.push(locale);
            if (master[locale] === true || master[locale] === 1) {
                toLoad.push(prefix + locale + '/' + suffix);
            }
        }
    }

    function addIfExists(req, locale, toLoad, prefix, suffix) {
        var fullName = prefix + locale + '/' + suffix;
        if (require._fileExists(req.toUrl(fullName + '.js'))) {
            toLoad.push(fullName);
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     * This is not robust in IE for transferring methods that match
     * Object.prototype names, but the uses of mixin here seem unlikely to
     * trigger a problem related to that.
     */
    function mixin(target, source, force) {
        var prop;
        for (prop in source) {
            if (source.hasOwnProperty(prop) && (!target.hasOwnProperty(prop) || force)) {
                target[prop] = source[prop];
            } else if (typeof source[prop] === 'object') {
                if (!target[prop] && source[prop]) {
                    target[prop] = {};
                }
                mixin(target[prop], source[prop], force);
            }
        }
    }


    var masterConfig = module.config ? module.config() : {};

    return {
        version: '2.0.6',
        /**
         * Called when a dependency needs to be loaded.
         */
        load: function (name, req, onLoad, config) {
            config = config || {};

            if (config.locale) {
                masterConfig.locale = config.locale;
            }

            var masterName,
                match = nlsRegExp.exec(name),
                prefix = match[1],
                locale = match[4],
                suffix = match[5],
                parts = locale.split('-'),
                toLoad = [],
                value = {},
                i, part, current = '';

            //If match[5] is blank, it means this is the top bundle definition,
            //so it does not have to be handled. Locale-specific requests
            //will have a match[4] value but no match[5]
            if (match[5]) {
                //locale-specific bundle
                prefix = match[1];
                masterName = prefix + suffix;
            } else {
                //Top-level bundle.
                masterName = name;
                suffix = match[4];
                locale = masterConfig.locale;
                if (!locale) {
                    locale = masterConfig.locale =
                        typeof navigator === 'undefined' ? 'root' :
                        ((navigator.languages && navigator.languages[0]) ||
                         navigator.language ||
                         navigator.userLanguage || 'root').toLowerCase();
                }
                parts = locale.split('-');
            }

            if (config.isBuild) {
                //Check for existence of all locale possible files and
                //require them if exist.
                toLoad.push(masterName);
                addIfExists(req, 'root', toLoad, prefix, suffix);
                for (i = 0; i < parts.length; i++) {
                    part = parts[i];
                    current += (current ? '-' : '') + part;
                    addIfExists(req, current, toLoad, prefix, suffix);
                }

                req(toLoad, function () {
                    onLoad();
                });
            } else {
                //First, fetch the master bundle, it knows what locales are available.
                req([masterName], function (master) {
                    //Figure out the best fit
                    var needed = [],
                        part;

                    //Always allow for root, then do the rest of the locale parts.
                    addPart('root', master, needed, toLoad, prefix, suffix);
                    for (i = 0; i < parts.length; i++) {
                        part = parts[i];
                        current += (current ? '-' : '') + part;
                        addPart(current, master, needed, toLoad, prefix, suffix);
                    }

                    //Load all the parts missing.
                    req(toLoad, function () {
                        var i, partBundle, part;
                        for (i = needed.length - 1; i > -1 && needed[i]; i--) {
                            part = needed[i];
                            partBundle = master[part];
                            if (partBundle === true || partBundle === 1) {
                                partBundle = req(prefix + part + '/' + suffix);
                            }
                            mixin(value, partBundle);
                        }

                        //All done, notify the loader.
                        onLoad(value);
                    });
                });
            }
        }
    };
});
