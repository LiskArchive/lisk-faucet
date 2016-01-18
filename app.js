var express = require('express'),
    config = require('./config.json').configuration,
    development = config.development,
    production = config.production,
    redis = require('redis'),
    client = redis.createClient(
        config.redis.port,
        config.redis.host
    ),
    async = require('async'),
    _ = require('underscore'),
    path = require('path'),
    api = require('./api');

var app = express();

client.debug_mode = true;

app.configure(function () {
    app.set('strict routing', true);
    app.set("lisk address", "http://" + config.lisk.host + ":" + config.lisk.port);

    app.passphrase = config.lisk.passphrase;
    app.address = config.lisk.address;
    app.amountToSend = config.amount;
    app.cacheTTL = config.cacheTTL;

    app.use(function (req, res, next) {
        req.lisk = app.get("lisk address");
        return next();
    });

    app.use(function (req, res, next) {
        req.fixedPoint = config.fixedPoint;
        next();
    });

    app.use(function (req, res, next) {
        req.redis = client;
        return next();
    });


    app.use(express.logger());
    app.use(express.static(path.join(__dirname, "public")));
    app.use(express.compress());
    app.use(express.methodOverride());
    app.use(express.bodyParser());
});

app.configure("development", function () {
    app.set("host", development.host);
    app.set("port", development.port);
    app.captcha = development.captcha;
	app.set
});

app.configure("production", function () {
    app.set("host", production.host);
    app.set("port", production.port);
    app.captcha = production.captcha;
});

api(app);
app.listen(app.get('port'), app.get('host'), function (err) {
	if (err) {
		console.log(err);
	} else {
		console.log("Server started at " + app.get('host') + ":" + app.get('port'));
	}
});
