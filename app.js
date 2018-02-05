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
    api = require('./api'),
    bodyParser = require('body-parser'),
    multer = require('multer'),
    methodOverride = require('method-override');

var app = express();

client.debug_mode = true;

app.set('strict routing', true);
app.set("lisk address", "http://" + config.lisk.host + ":" + config.lisk.port);

if (config.lisk.port == 8000) {
    app.set("lisk network", 'mainnet');
} else {
    app.set("lisk network", 'testnet');
}

app.locals.host = config.lisk.host;
app.locals.port = config.lisk.port;
app.locals.nethash = config.lisk.nethash;
app.locals.broadhash = config.lisk.broadhash;
app.locals.liskVersion = config.lisk.version;
app.locals.liskMinVersion = config.lisk.minVersion;
app.locals.passphrase = config.lisk.passphrase;
app.locals.address = config.lisk.address;
app.locals.amountToSend = config.amount;
app.locals.cacheTTL = config.cacheTTL;

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
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer());

if (app.get('env') === 'development') {
    app.set("host", development.host);
    app.set("port", development.port);
    app.locals.captcha = development.captcha;
}

if (app.get('env') === 'production') {
    app.set("host", production.host);
    app.set("port", production.port);
    app.locals.captcha = production.captcha;
}

api(app);
app.listen(app.get('port'), app.get('host'), function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("Server started at " + app.get('host') + ":" + app.get('port'));
    }
});
