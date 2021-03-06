var fs = require('fs');
var path = require('path');
// var UUID = require('uuid-1345');
var crypto = require('crypto');
var rs = require('readline-sync');
var irisUtils = require('iris-utils');
var execSync = require('child_process').execSync;
var Sia = require('sia-api');


var root = path.join(__dirname,'../../');
var temp = '/tmp';

var platform = process.platform;
if(platform == 'win32') {
	platform = 'windows';
	var temp = path.join(process.env.TEMP);
}

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
	console.log("\nDid setup run already?".red.bold)
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
var siaPath = path.join(process.env.APPDATA || '',"Sia-UI/sia");
var testPath = path.join(siaPath,'host/host.log');

if(!testFile(path.join(siaPath,'host/host.log'))) {
	// no Sia-UI..
	// ask User..
	console.log("Sia data folder not found!".yellow.bold);
	console.log("It contain sub-folders like 'host','consensus' etc.");
	console.log("Typically "+"siad".bold+" itself");
	while(true) {
		siaPath = rs.question("Please specify sia data folder:");
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

if(platform == "windows") {

	var application = "@echo off\n"
					+"cd ..\n"
					+"bin\\node\\node sia-node %*\n"
					+"cd bin\n";				

	var service = "@echo off\n"
					+"cd ..\n"
					+"bin\\node\\node run sia-node %*\n"
					+"cd bin\n";				

	fs.writeFileSync(path.join(root,'bin/sia-node.bat'), application);
	fs.writeFileSync(path.join(root,'bin/sia-node-service.bat'), service);

}
else {
	var DIR = 'DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";';

	var application = "# !/bin/bash\n"
					+"pushd . > /dev/null\n"
					+DIR+'\n'
					+"cd $DIR/..\n"
					+"bin/node/node sia-node \"$@\"\n"
					+"popd > /dev/null\n";

	var service = "# !/bin/bash\n"
					+"pushd . > /dev/null\n"
					+DIR+'\n'
					+"cd $DIR/..\n"
					+"bin/node/node run sia-node \"$@\"\n"
					+"popd > /dev/null\n";				

	var p = path.join(root,'bin/sia-node').toString();
	fs.writeFileSync(p, application);
	execSync("chmod a+x "+p)
	fs.writeFileSync(p+'-service', service);
	execSync("chmod a+x "+p+'-service')	
}

// ---

var suffix = platform == "windows" ? "bat" : "sh";
console.log("To run, start one of the following:\n");
console.log(("bin/sia-node."+suffix).bold+" - application");
console.log(("bin/sia-node-service."+suffix).bold+" - service");
console.log("\nYou can access Web UI at "+"http://localhost:5566\n".yellow.bold);


var Sia = require('sia-api');
var sia = new Sia({
    host : "http://127.0.0.1:9980",
    timeout : 3 * 1000,
    verbose : false
});
console.log("Checking for local Sia daemon...")
sia.daemon.version(function(err, resp) {
    if(err) {
    	console.log("");
        console.log("Warning: Unable to connect to local Sia daemon".magenta.bold);
        console.log(err.toString());
        console.log("Please start and sync Sia before running Sia Node".yellow.bold);
    }
    else
        console.log("Found local Sia daemon version:".cyan.bold, resp.version.bold);
})
