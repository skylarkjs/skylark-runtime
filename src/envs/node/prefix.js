(function (global) {
		var  nodeRequire = skyrt.nodeRequire = require,
        	 nodeDefine = define,
        	 reqMain = require.main;

        //Temporarily hide require and define to allow skylark-runtime to define
        //them.
        require = undefined;
        define = undefined;
        global.skyrt = skyrt;