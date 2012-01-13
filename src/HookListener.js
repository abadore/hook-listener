/**
 * example config.json:
 *
 * {
 *  "repositories":[
 *      {
 *          "url": "https://github.com/myname/myproject",
 *          "dir": "/var/lib/node/projectDir"
 *      }
 *  ],
 *  "service": "node_service"
 * }
 *
 */

if (process.argv.length < 4 || isNaN(parseInt(process.argv[2]))) {
	console.log("usage: node HookListener port config")
	console.log("port number and configuration must be provided");
	process.exit(1);
}

var port = parseInt(process.argv[2]);
var util = require('util');
var cp = require('child_process');
var fs = require('fs'),
	config;
try {
	config = JSON.parse(fs.readFileSync(process.argv[3]));
	if (!config.repositories || config.repositories.length === 0) {
		console.log("there are no repositories configured, HookListener will exit");
		process.exit(1);
	}
}
catch(e) {
	console.log(e);
	console.log("problem reading config file");
	process.exit(1);
}

var getProc = function(name, args, options) {
	var nextProc,
		spawn = function(name, args, options) {
			console.log("spawning process " + name);
			var that = this;
			if (!options) {
				options = {};
			}
			var child = cp.spawn(name, args, options);
			child.stdout.on('data', function(data) {
				console.log('> ' + data);
			});
			child.stderr.on('data', function(data) {
				console.log('> ' + data);
			});
			child.on('exit', function(code) {
				console.log("process " + name + " exited with code " + code );
				if (code === 0 && nextProc) {
					nextProc.spawnNext();
				}
				else if (code > 0) {
					console.error("Error process " + name + " exited with error");
				}
			});
		};
	if (name) {
		spawn(name, args, options);
	}
	return {
		name: null,
		args: null,
		options: null,
		next: function(name, args, options) {
			nextProc = getProc();
			nextProc.name = name;
			nextProc.args = args;
			nextProc.options = options;
			return nextProc;
		},
		spawnNext: function() {
			console.log("spawnNext " + this.name);
			spawn(this.name, this.args, this.options);
		}
	};
};

function onRequest(req, res) {
	var data = "";
	req.setEncoding('utf8');
	req.on('data', function(chunk) {
		data += chunk;
	});
	req.on('end', function() {
		try {
			data = decodeURIComponent(data.substr(8));
			data = JSON.parse(data);
			console.log("data received");
			console.log(util.inspect(data));
			if (data.repository.url) {
				for (var i = 0, l = config.repositories.length; i < l; i++) {
					if (config.repositories[i].url === data.repository.url) {
						getProc("git", ["pull"], {cwd: config.repositories[i].dir}).
							next("service", [config.service, "restart"]);
					}
				}
			}
		}
		catch (e) {
			console.error(e);
		}
		res.end();
	});
};

var http = require('http'),
	server = http.createServer(onRequest);

server.listen(port);
