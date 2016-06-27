# Sia Node

[![dependencies Status](https://david-dm.org/aspectron/sia-node.svg)](https://david-dm.org/aspectron/sia-node#info=dependencies)
[![license:mit](https://img.shields.io/badge/license-mit-blue.svg)](https://opensource.org/licenses/MIT)

Sia Host (siad) monitoring utility for use with [Sia Cluster](http://github.com/aspectron/sia-cluster)

More information on the project can be found here: http://aspectron.com/#SiaCluster

*siad* must be running on the local computer where Sia Node interface is deployed.

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


## Deploying on Windows

* Download and install latest [NodeJs](http://nodejs.org)
* Download and install [Git for Windows](https://git-for-windows.github.io/)
* Install Sia Node:
```bash
git clone https://github.com/aspectron/sia-node
cd sia-node
npm install
```
* Run Sia Node (Sia UI or `siad` must be running on a local system!)
```
node sia-node
```
* Add a shortcut to `sia-node.bat` to Startup folder to launch at startup
  * Press Win+R keys together
  * type: shell:Startup
  * Add shortcut to `sia-node.bat` (you can drag it with right mouse button key into Startup folder and then select "Create Shortcut")
  * To startup minimized, right click on the shortcut, select "Properties" menu and select "Run: Minimized".
