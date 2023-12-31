    // modified by lwf
    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */ 
    var _def = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        ///if (useInteractive) {
        ///    node = currentlyAddingScript || getInteractiveScript();
        ///    if (node) {
        ///        if (!name) {
        ///            name = node.getAttribute('data-requiremodule');
        ///        }
        ///        context = contexts[node.getAttribute('data-requirecontext')];
        ///    }
        ///}

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        ///if (context) {
        ///    context.defQueue.push([name, deps, callback]);
        ///    context.defQueueMap[name] = true;
        ///} else {
            globalDefQueue.push([name, deps, callback]);
        ///}

        return name;
    };

    define = skyrt.define = function (name, deps, callback) {
        name = _def(name,deps,callback);
        if (name && define.enable) {
            try {
                require(name);
            } catch (e) {
                console.warn(e);
            }            
        }
    };
 

    define.amd = {
        jQuery: true,
        enable: false
    };