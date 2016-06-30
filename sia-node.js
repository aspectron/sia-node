var os = require('os');
var fs = require('fs');
var util = require('util');
var crypto = require('crypto');
var Blowfish = require('blowfish');
var UUID = require('uuid-1345');
var irisApp = require('iris-app');
var _ = require('iris-underscore');
var scrypt = require('./lib/scrypt');
var BigInt = require("big-integer");
var Sia = require('sia-api');

var Monitors = require("iris-stats").monitors;

function SiaNode() {
    var self = this;
    irisApp.Application.apply(this, arguments);

    self.monitors = { }
    self.state = { version : 1 }
    self.stateUpdateFreq = 60 * 1000;
    self.ts = Date.now() - self.stateUpdateFreq * 2;
    self.platform = os.platform();

    if((!self.config.rpc.address && !self.config.rpc.port) || !self.config.rpc.auth) {
        console.log("Please configure (rpc.address or rpc.port) and rpc.auth settings in".red.bold,"config/sia-node.local.conf".bold);
        return;
    }

    var cryptConfig = self.getConfig('encryption');
    if(!cryptConfig.ready) {
        var ccl = { scrypt : { } }
        ccl.ready = true;
        cryptConfig.scrypt.salt = ccl.scrypt.salt = crypto.createHash('sha256').update(''+self.uuid+Math.random()+Date.now()).digest('hex');
        fs.writeFileSync('config/encryption.local.conf', JSON.stringify(ccl,null,'\t'));
    }

    function encrypt(data, key, iv) {
        cipher = crypto.createCipher(cryptConfig.chipher, key);
        var crypted = cipher.update(data, 'utf-8', 'hex')
        crypted += cipher.final('hex');

        var bf = new Blowfish(key);
        crypted = bf.encrypt(crypted).toLowerCase();

        return crypted;
    }
     
    function decrypt(hex, key) {
        var bf = new Blowfish(key);
        hex = bf.decrypt(hex);

        var decipher = crypto.createDecipher(cryptConfig.chipher, key);
        var decrypted = decipher.update(hex, 'hex', 'utf-8')
        decrypted += decipher.final('utf-8');
        return decrypted;
    }

    self.init(function(callback) {

        var ident = self.config.identifier || os.hostname();

        console.log("SIA-NODE instance identifier:".cyan.bold,"'"+ident.toUpperCase().bold+"'");

        self.rpc = new irisApp.RPC.Multiplexer({
            uuid: self.uuid,
            // address: self.config.rpc.address,
            // auth: self.config.rpc.auth,
            certificates: self.certificates,
            designation: ident,
            pingFreq: 3 * 1000
        }, self.config.rpc, "SIA-CLUSTER");


        self.rpc.on('connect', function(address, uuid, stream) {
            console.log(stream.designation.bold, "RPC Connect:".green.bold,address,uuid);
            self.rpcConnected = true;

            // trigger update when sia-cluster connects
            dpc(1000, function() {
                self.update(_.noop);
            })
        });

        self.rpc.on('disconnect', function(uuid, stream) {
            console.log(stream.designation, "RPC Disconnect".red.bold, uuid);
            self.rpcConnected = false;
        });

        self.rpc.on("setting", function(args, callback){ //---- ----------- @asy
            // console.log("host-setting".greenBG, args)
            var setting = {};
            switch (args.name){
                case "host.internalsettings.acceptingcontracts":
                    setting["acceptingcontracts"] = !!args.value;
                break;
                case "host.internalsettings.netaddress":
                    setting[args.name.split(".").pop()] = args.value;
                break;
                case "host.internalsettings.collateral":
                case "host.internalsettings.collateralbudget":
                case "host.internalsettings.maxcollateral":
                case "host.internalsettings.mincontractprice":
                case "host.internalsettings.mindownloadbandwidthprice":
                case "host.internalsettings.minstorageprice":
                case "host.internalsettings.minuploadbandwidthprice":
                case "host.internalsettings.minimumuploadbandwidthprice":
                    try {
                        var ident = args.name.split(".").pop();
                        if(_.isString(args.value))
                            setting[ident] = args.value;
                        else
                            setting[ident] = BigInt(args.value).toString();
                    } catch(ex) {
                        return callback(ex);
                    }
                break;
                case "host.internalsettings.maxduration":
                case "host.internalsettings.maxdownloadbatchsize":
                case "host.internalsettings.maxrevisebatchsize":
                case "host.internalsettings.windowsize":
                    setting[args.name.split(".").pop()] = parseInt(args.value, 10);
                break;
                default:
                    return callback({error: "Invalid Setting name: '"+args.name+"' "});
            }
            self.sia.host.post(setting, function(err, result){
                err && console.log("sia:setting, error".redBG, err.toString())
                if (err)
                    return next(err);

                self.updateSiad(function() {
                    self.rpc.dispatch({
                        op : 'node-state',
                        data : self.state
                    });

                    next(null, {state: self.state});
                })
            });

            function next(err, result){
                if (_.isFunction(callback)){
                    if (err && _.isString(err))
                        err = {error: err};
                    callback(err, result);
                }
            }
        })

        self.rpc.on('get-state', function(msg, callback) {
            callback(null, self.state);
        })

        self.rpc.on('poll-state', function(msg, callback) {
            self.update(function() {
                callback(null, self.state);
            })
        })

        self.rpc.on('fetch-host-logfile', function(msg, callback) {
            var logfile = self.config.siad.logfile;
            if(!logfile)
                return callback({ error : "Log file is not configured"});

            if(!fs.existsSync(logfile))
                return callback({ error : "Unable to locate log file "+logfile});

            fs.readFile(logfile, { encoding: 'utf-8' }, function(err, text) {
                if(err)
                    return callback(err);

                return callback(null, text);
            })
        })

        // receive user passphrase and wallet key
        // generate scrypt hash out of the key
        // encrypt passphrase using this hash
        // store encrypted key in the config file
        self.rpc.on('init-wallet-passphrase', function(msg, callback) {
            var passphrase = msg.passphrase;
            var walletKey = msg.walletKey;

            var ek = scrypt.createHash(passphrase, cryptConfig.scrypt);
            var key = encrypt(walletKey, ek);
            var test = encrypt(self.uuid, ek)
            var o = {
                key : key,
                test : test
            }
            fs.writeFileSync('config/wallet.local.conf', JSON.stringify(o, null, "\t"));
            callback();
        })

        self.rpc.on('lock-wallet', function(msg, callback) {
            self.sia.wallet.lock(callback);

        })

        // receive user passphrase
        // read config and decrypt key stored in config
        // provide key to sia to unlock wallet
        // alternatively allow remote to simply provide the unlock key directly to sia
        self.rpc.on('unlock-wallet', function(msg, callback) {
            var passphrase = msg.passphrase;
            switch(msg.type) {
                case 'local' : {
                    var wc = self.getConfig('wallet');
                    if (!wc || !wc.key)
                        return callback({error: "Local passphrase is not initiated yet.", code: "LOCAL-KEY-MISSING"});
                    var ek = scrypt.createHash(passphrase, cryptConfig.scrypt);
                    try {
                        var key = decrypt(wc.key, ek);
                        // give up to 5 minutes for unlock request to complete
                        //self.sia.requestOptions.push({ timeout : 1000 * 60 * 5 })
                        self.sia.wallet.unlock({ encryptionpassword : key }, { timeout : 1000 * 60 * 5 }, callback);
                    } catch(ex) {
                        callback({ error: ex.toString() });
                    }
                } break;

                case 'direct' : {
                    //self.sia.requestOptions.push({ timeout : 1000 * 60 * 5 })
                    self.sia.wallet.unlock({ encryptionpassword : passphrase }, { timeout : 1000 * 60 * 5 }, callback);
                } break;

                default : {
                    callback({error: "Sia Node requires wallet key type ('local' or 'direct')"})
                }
            }
        })


        self.testPassPhrase = function(passphrase, callback) {
            var wc = self.getConfig('wallet');
            if (!wc || !wc.test)
                return callback({error: "Local passphrase is not initiated yet.", code: "LOCAL-KEY-MISSING"});

            var ek = scrypt.createHash(passphrase, cryptConfig.scrypt);
            try {
                var test = decrypt(wc.test, ek);
                if(test == self.uuid)
                    return callback();
            } catch(ex) {
                return callback({error: ex.message});
            }
            
            callback({ error : "Wrong Passphrase" });
        }

        self.rpc.on('send-siacoins', function(msg, callback) {
            self.testPassPhrase(msg.passphrase, function(err) {
                if(err)
                    return callback(err);

                self.sia.wallet.siacoins.post({
                    amount : msg.amount,
                    destination : msg.destination
                }, callback);
            })
        })


        // ---

        self.sia = new Sia({
            host : self.config.siad.host,
            rpcServer : self.rpc,
            timeout : 60 * 1000,
            verbose : false
        });

        self.sia.daemon.version(function(err, resp) {
            if(err)
                console.log("Error accessing siad:".red.bold,err);
            else
                console.log("Sia daemon version:".cyan.bold, resp.version.bold);
        })

        // block function to prevent remote invocation without passphrase
        function block_(args, callback) { return callback({ error : "Blocked" }); }
        self.sia.wallet.siacoins.post = block_;
        self.sia.wallet.siafunds.post = block_;

        callback();        
    })


    self.init(function(callback) {
        _.each(Monitors, function(ctor, n) {
            var monitor = new ctor();
            self.monitors[monitor.ident] = monitor;
        })

        dpc(1000, stateUpdateLoop);

        callback();
    })
  

    function stateUpdateLoop() {
        self.update(function() {
            dpc(self.stateUpdateFreq, stateUpdateLoop);            
        })
    }


    self.update = function(callback) {

        var ts = Date.now();
        if(ts - self.ts < 1000 * 3)
            return callback();
        self.ts = ts;

        self.state.errors = { }

        self.updateMonitors(function() {
            self.updateSiad(function() {
                // console.log(self.state);
                self.rpc.dispatch({
                    op : 'node-state',
                    data : self.state
                });

                callback();
            })
        })            
        
    }

    self.updateMonitors = function(callback) {
        _.asyncMap(_.values(self.monitors), function(monitor, callback) {
            if(!monitor.update)
                return callback();

            monitor.update(function(err, data) {
                self.state[monitor.ident] = data;
                callback();
            })
        }, function() {
            callback();
        })
    }

    var transform = {

        version : function(data) {
            data.platform = self.platform;

            return data;
        },

        wallet : function(data) {
            if(!data.unlocked && 
               !parseFloat(data.confirmedsiacoinbalance) && 
               !parseFloat(data.unconfirmedoutgoingsiacoins) &&
               !parseFloat(data.unconfirmedincomingsiacoins) && 
               !parseFloat(data.siafundbalance) &&
               !parseFloat(data.siacoinclaimbalance)) {
                    data.confirmedsiacoinbalance = 
                    data.unconfirmedoutgoingsiacoins = 
                    data.unconfirmedincomingsiacoins = 
                    data.siafundbalance = 
                    data.siacoinclaimbalance = "N/A";
            }

            return data;
        },

        storage : function(_data) {
            var data = { }
            _.each(_data.folders, function(o) {
                data[o.path] = o;
            })
            return data;
        }
    }

    self.updateSiad = function(callback) {

        var list = ["/daemon/version","/host", "/host/storage", "/wallet","/consensus"];

        _.asyncMap(list, function(path, callback) {
            
            var ident = path.split('/').pop();

            self.sia.ifacePathMap[path].get(function(err, data) {
                if(err)
                    self.state.errors[ident] = err+'';
                else {

                    if(transform[ident])
                        data = transform[ident](data);

                    if(ident == 'storage')
                        self.state.host.storage = data;
                    else
                        self.state[ident] = data;                

                    if(ident == "consensus" && data) {
                        if(!data.synced) {
                            console.log("siad syncing -- block".yellow.bold,data.height);
                            self.siad_syncing_ = true;
                        }
                        else if(self.siad_syncing_) {
                            console.log("siad sync done -- block".green.bold,data.height);
                            self.siad_syncing_ = false;
                        }

                        delete data.target;
                    }
                }

                callback();
            })
        }, function() {
            // console.log(self.state);
            callback();
        })
    }
}


util.inherits(SiaNode, irisApp.Application);
new SiaNode(__dirname);

