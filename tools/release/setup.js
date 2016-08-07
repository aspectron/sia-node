var fs = require('fs');
var path = require('path');
// var UUID = require('uuid-1345');
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
console.log("Please provide IP of Sia Cluster (default: 127.0.0.1)")
var ip = rs.question("IP of Sia Cluster:".bold);

// path to logs
// try Sia-UI
var siaPath = path.join(process.env.APPDATA,"Sia-UI/sia");
console.log("siaPath",siaPath);
var testPath = path.join(siaPath,'host/host.log');
console.log("testPath",testPath);

if(!testFile(path.join(siaPath,'host/host.log'))) {
	// no Sia-UI..
	// ask User..
	while(true) {
		console.log("Sia folder not found!".yellow.bold);
		console.log("It contain folders like 'host','consensus' etc.");
		console.log("Typically "+"siad".bold+" itself");
		siaPath = rs.question("Please specify folder:");
		var hostLog = path.join(siaPath,'host/host.log');
		if(testFile(hostLog))
			break;
		
		console.log("Error: '".magenta.bold+hostLog.bold+"' not found".magenta.bold);
		console.log("You can configure manually later in sia-node.local.conf");
		if (rs.keyInYN('Do you want to retry?'))
			continue;
		else {
			siaPath = null;
			break;
		}
		
	}
}
// --

var local_conf = fs.readFileSync(path.join(root,'config/sia-node.local.conf-example'), { encoding : 'utf-8' });

local_conf = local_conf
				.replace('1299ece0263565a53df103a34910884d5016a10d86c06e5f309f17761a965d28',auth);

if(ip)
	local_conf = local_conf
				.replace('address : "127.0.0.1:58481"','address : "'+ip+':58481"');

if(siaPath)
	local_conf = local_conf
				.replace("path : 'ignore'","path : '"+siaPath.toString().replace(/\\/g,'\\\\')+"'");

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
