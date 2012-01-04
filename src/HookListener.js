if (process.argv.length < 3 || isNaN(parseInt(process.argv[2]))) {
	console.log("port number must be provided");
	process.exit(1);
}

var port = parseInt(process.argv[2]);
var util = require('util');

function onRequest(req, res) {
	var data = "";
	req.setEncoding('utf8');
	req.on('data', function(chunk) {
		data += chunk;
	});
	req.on('end', function() {
		try {
			data = JSON.parse(data);
			console.log(util.inspect(data));
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
