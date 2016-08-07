# Sia Node 0.9.2

http://aspectron.com/#SiaCluster

[![dependencies Status](https://david-dm.org/aspectron/sia-node.svg)](https://david-dm.org/aspectron/sia-node#info=dependencies)
[![license:mit](https://img.shields.io/badge/license-mit-blue.svg)](https://opensource.org/licenses/MIT)

Sia Host (siad) monitoring utility for use with [Sia Cluster](http://github.com/aspectron/sia-cluster)

*siad* must be running on the local computer where Sia Node interface is deployed.


## Setup

Download binaries from GitHub located here:
https://github.com/aspectron/sia-cluster/releases

#### Setup Sia Node 

* Download & Extract sia-node-vX-X-X-win64.zip
* Windows: run `sia-node-vX-X-X-win64/bin/setup.bat"
* Linux & Darwin: run `sia-node-vX-X-X-win64/bin/setup.sh"

You will need to specify:
* **auth** - created by Sia Cluster setup
* **address/ip** - of Sia Cluster server (default is 127.0.0.1; if not sure, hit ENTER)
* **path** - to Sia data folder (containing `host`, `consensus` etc.);  If running Sia-UI, setup script will attempt to locate this folder automatically in your APPDATA.

Once complete, you can start Sia Node:
* Windows: `bin/sia-node.bat` or `bin/sia-node-service.bat`
* Linux & Darwin: `bin/sia-node.sh` or `bin/sia-node-service.sh`


## Configuration

You need to configure following settings in your `config/sia-node.local.conf`:

```
{
	// instance identifier - if not set, defaults to hostname
	identifier : "<instance-name>",

	// rpc server IP and auth string that 
	// matches your Sia Cluster deployment
	rpc : {
		address : "<sia-cluster-ip>:<port>",
		auth : "<unique-auth-hex-string>"
	}
}
```


## Deploying on Ubuntu

* [NodeJs Installation Instructions](https://github.com/aspectron/iris-app#setting-up-nodejs-on-your-system)
* [Running as Systemd Service (Ubuntu > 15.x)](https://github.com/aspectron/iris-app#deploying-systemd-service)
* [Running as Upstart Service (Ubuntu < 15.x)](https://github.com/aspectron/iris-app#deploying-as-ubuntu-upstart-service)

Full installation script:
```bash
cd ~
wget https://nodejs.org/dist/v6.2.2/node-v6.2.2-linux-x64.tar.xz
tar xf node-v6.2.2-linux-x64.tar.xz
ln -s node-v6.2.2-linux-x64 node
echo -e "\n\nPATH=\"\$HOME/node/bin:\$PATH\"\n\n"
source ~/.profile
git clone https://github.com/aspectron/sia-node
cd sia-node
npm install
node sia-node
```

## Deploying on Windows

For windows, download and install:
* NodeJs - https://nodejs.org/en/download/current/
* Git for Windows - https://git-for-windows.github.io/

Run the following from command line:
```bash
git clone https://github.com/aspectron/sia-node
cd sia-node
npm install
node sia-node
```

* Add a shortcut to `sia-node.bat` to Startup folder to launch at startup
  * Press Win+R keys together
  * type: shell:Startup
  * Add shortcut to `sia-node.bat` (you can drag it with right mouse button key into Startup folder and then select "Create Shortcut")
  * To startup minimized, right click on the shortcut, select "Properties" menu and select "Run: Minimized".
