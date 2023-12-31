/*
 * This script will create the final r.js file used in node projects to use
 * RequireJS.
 *
 * This file uses Node to run:
 * node dist.js
 */

/*jslint strict: false */
/*global require: false, process: false, console: false */


var fs = require('fs'),
    child_process = require('child_process'),
    x = fs.readFileSync('src/x.js', 'utf8'),
    loadRegExp = /\/\/INSERT ([\w\/\.\$\{\}]+)/g,
    moduleNameRegExp = /src\/([\w\/\-]+)\.js$/,
    defRegExp = /define\s*\(/,
    envs = ['browser', 'node', 'rhino', 'xpconnect','webworker'],

    optimizerStartFile = 'build/build.js',
    libText = '';

function readAndNameModule(fileName) {
    var contents = fs.readFileSync(fileName, 'utf8'),
        match = moduleNameRegExp.exec(fileName),
        moduleName = (match && match[1]) || fileName;

    //Insert the module name.
    return contents.replace(defRegExp, function (match) {
        return match + "'" + moduleName + "', ";
    });
}


//Inline file contents
envs.forEach(function(env){
    var contents = x.replace(loadRegExp, function (match, fileName) {
        fileName = fileName.replaceAll('${env}',env);
        console.log("insert file:"+fileName);
        var text = fs.readFileSync(fileName, 'utf8');
        return text;
    });
    //Set the isOpto flag to true
    fs.writeFileSync('dist/' + env +'/skylark-runtime.js', contents, 'utf8');

});
