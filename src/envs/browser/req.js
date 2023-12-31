//sloppy since eval enclosed with use strict causes problems if the source
//text is not strict-compliant.
/*jslint sloppy: true, evil: true */
/*global require, XMLHttpRequest */

(function () {
    var head, baseElement, dataMain, src,interactiveScript,currentlyAddingScript,mainScript,subPath;

    head = document.getElementsByTagName('head')[0];
    //If BASE tag is in play, using appendChild is a problem for IE6.
    //When that browser dies, this can be removed. Details in this jQuery bug:
    //http://dev.jquery.com/ticket/2709
    baseElement = document.getElementsByTagName('base')[0];
    if (baseElement) {
        head = baseElement.parentNode;
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }


    // Separate function to avoid eval pollution, same with arguments use.
    function exec() {
        eval(arguments[0]);
    }

    var req = require;

    // for sync require , by lwf
    req.get = function(context, id, relMap, localRequire) {
        context.intakeDefines(true);
        return context.defined[makeModuleMap(id, relMap, false, true)];
    };    

    req._nextTick = function (fn) {
        setTimeout(fn, 4);
    };
 

    function loadModuleByScriptTag(context,moduleName,url) {
        const   readyRegExp =  navigator.platform === 'PLAYSTATION 3' ? /^complete$/ : /^(complete|loaded)$/;

         //* Creates the node for the load command. Only used in browser envs.
         function createNode(config, moduleName, url) {
            var node = config.xhtml ?
                    document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                    document.createElement('script');
            node.type = config.scriptType || 'text/javascript';
            node.charset = 'utf-8';
            node.async = true;
            return node;
        }


        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            ///if (node.detachEvent && !isOpera) {
            ///    //Probably IE. If not it will throw an error, which will be
            ///    //useful to know.
            ///    if (ieName) {
            ///        node.detachEvent(ieName, func);
            ///    }
            ///} else {
                node.removeEventListener(name, func, false);
            ///}
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }


        /**
         * callback for script loads, used to check status of loading.
         *
         * @param {Event} evt the event from the browser for the script
         * that was loaded.
         */
        function onScriptLoad(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            if (evt.type === 'load' ||
                    (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                //Reset interactive script so a script node is not held onto for
                //to long.
                interactiveScript = null;

                //Pull out the name of the module and the context.
                var data = getScriptData(evt);
                context.completeLoad(data.id);
            }
        }

        /**
         * Callback for script errors.
         */
        function onScriptError(evt) {
            var data = getScriptData(evt);
            if (!hasPathFallback(data.id)) {
                var parents = [];
                eachProp(registry, function(value, key) {
                    if (key.indexOf('_@r') !== 0) {
                        each(value.depMaps, function(depMap) {
                            if (depMap.id === data.id) {
                                parents.push(key);
                            }
                            return true;
                        });
                    }
                });
                // added by lwf 2016/07/16 begin
                if (parents.length == 0) {
                    var module  = registry[data.id];
                    if (module) {
                        module = module.map && module.map.parentMap;
                        parents.push(module.id+"("+module.url+")");
                    }
                }
                console.error("scripterror:" + data.id + 
                              (parents.length ? '", needed by: ' + parents.join(', ') :'"'));
                // added by lwf 2016/07/16 end
                
                return onError(makeError('scripterror', 'Script error for "' + data.id +
                                         (parents.length ?
                                         '", needed by: ' + parents.join(', ') :
                                         '"'), evt, [data.id]));
            }
        }

        var config = context.config;

        //In the browser so use a script tag
        node = createNode(config, moduleName, url);
        if (config.onNodeCreated) {
            config.onNodeCreated(node, config, moduleName, url);
        }

        node.setAttribute('data-requirecontext', context.contextName);
        node.setAttribute('data-requiremodule', moduleName);

        //Set up load listener. Test attachEvent first because IE9 has
        //a subtle issue in its addEventListener and script onload firings
        //that do not match the behavior of all other browsers with
        //addEventListener support, which fire the onload event for a
        //script right after the script execution. See:
        //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
        //UNFORTUNATELY Opera implements attachEvent but does not follow the script
        //script execution mode.
        /*
        if (node.attachEvent &&
                //Check if node.attachEvent is artificially added by custom script or
                //natively supported by browser
                //read https://github.com/jrburke/requirejs/issues/187
                //if we can NOT find [native code] then it must NOT natively supported.
                //in IE8, node.attachEvent does not have toString()
                //Note the test for "[native code" with no closing brace, see:
                //https://github.com/jrburke/requirejs/issues/273
                !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                !isOpera) {
            //Probably IE. IE (at least 6-8) do not fire
            //script onload right after executing the script, so
            //we cannot tie the anonymous define call to a name.
            //However, IE reports the script as being in 'interactive'
            //readyState at the time of the define call.
            useInteractive = true;

            node.attachEvent('onreadystatechange', context.onScriptLoad);
            //It would be great to add an error handler here to catch
            //404s in IE9+. However, onreadystatechange will fire before
            //the error handler, so that does not help. If addEventListener
            //is used, then IE will fire error before load, but we cannot
            //use that pathway given the connect.microsoft.com issue
            //mentioned above about not doing the 'script execute,
            //then fire the script load event listener before execute
            //next script' that other browsers do.
            //Best hope: IE10 fixes the issues,
            //and then destroys all installs of IE 6-9.
            //node.attachEvent('onerror', context.onScriptError);
        } else {

            node.addEventListener('load', context.onScriptLoad, false);
            node.addEventListener('error', context.onScriptError, false);
        }
        */
        node.addEventListener('load', onScriptLoad, false);
        node.addEventListener('error', onScriptError, false);
        node.src = url;

        //For some cache cases in IE 6-8, the script executes before the end
        //of the appendChild execution, so to tie an anonymous define
        //call to the module name (which is stored on the node), hold on
        //to a reference to this node, but clear after the DOM insertion.
        currentlyAddingScript = node;
        if (baseElement) {
            head.insertBefore(node, baseElement);
        } else {
            head.appendChild(node);
        }
        currentlyAddingScript = null;

        return node;

    }

    function loadModuleByXhr(context,moduleName,url) {
        var xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);
        xhr.send();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                exec(xhr.responseText);

                //Support anonymous modules.
                context.completeLoad(moduleName);
            }
        };
    }

    req._load = function (context, moduleName, url) {

        if (context.config.loader=="xhr") {
            return loadModuleByXhr(context,moduleName,url);
        } else {
            return loadModuleByScriptTag(context,moduleName,url);

        }
    };


    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (!cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

}());