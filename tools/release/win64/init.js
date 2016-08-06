var fs = require('fs');
var path = require('path');
var UUID = require('node-uuid');
var crypto = require('crypto');
var rs = require('readline-sync');
var irisUtils = require('iris-utils');

var root = path.join(__dirname,'../../../');

function testFile(file) {
	try {
		fs.accessSync(file);
		return true;
	}
	catch(ex) {
		return false;
	}
}

var force = process.argv.join(' ').match(/--force/ig) ? true : false;

if(!force && testFile(path.join(root,'config/sia-node.local.conf'))) {
	console.log("\nHas init.bat been ran already?".red.bold)
	console.log("config/sia-node.local.conf".bold+" already exists!".bold)
	console.log("\nUse "+"--force".bold+" to re-initialize (you will loose your settings!)\n\n")
	process.exit(0);
}

// ---
console.log("\n");
console.log("Please provide auth created by Sia Cluster".bold);
console.log("\n");
var auth = rs.question("Auth:".bold);
if(!auth) {
	console.log("You must specify auth string. Aborting...");
	process.exit(1);
}
// --

var local_conf = fs.readFileSync(path.join(root,'config/sia-node.local.conf-example'), { encoding : 'utf-8' });

local_conf = local_conf
				.replace('1299ece0263565a53df103a34910884d5016a10d86c06e5f309f17761a965d28',auth);

fs.writeFileSync(path.join(root,'config/sia-node.local.conf'), local_conf);

// ---

var application = "@echo off\n"
				+"cd ..\n"
				+"bin\\node\\node sia-node\n"
				+"cd bin\n";				

var service = "@echo off\n"
				+"cd ..\n"
				+"bin\\node\\node run sia-node\n"
				+"cd bin\n";				

fs.writeFileSync(path.join(root,'bin/sia-node.bat'), application);
fs.writeFileSync(path.join(root,'bin/sia-node-service.bat'), service);

// ---

console.log("To run, start one of the following:\n");
console.log("bin/sia-node.bat".bold+" - application");
console.log("bin/sia-node-service.bat".bold+" - service");
console.log("\nConfigured to connect on "+"localhost\n".bold);
