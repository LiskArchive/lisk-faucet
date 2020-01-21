var express = require('express'),
    config = require('./config.json').configuration,
    development = config.development,
    production = config.production,
    redisClient = require('./api/redis'),
    async = require('async'),
    _ = require('underscore'),
    path = require('path'),
    api = require('./api'),
    bodyParser = require('body-parser'),
    multer = require('multer'),
    methodOverride = require('method-override');

redisClient.init(
    Number(process.env.REDIS_PORT) || config.redis.port,
    process.env.REDIS_HOST || config.redis.host
);

const client = redisClient.getClient();

var app = express();

client.debug_mode = true;

app.set('strict routing', true);
app.set("lisk address", "http://" + config.lisk.host + ":" + config.lisk.port);

if (config.lisk.port == 8000) {
    app.set("lisk network", 'mainnet');
} else if (config.lisk.port == 5000) {
    app.set("lisk network", 'betanet');
} else {
    app.set("lisk network", 'testnet');
}

app.locals.liskUrl = process.env.LISK_URL || config.lisk.port;
app.locals.nethash = process.env.LISK_NETHASH || config.lisk.nethash;
app.locals.broadhash = process.env.LISK_BROADHASH || config.lisk.broadhash;
app.locals.liskVersion = process.env.LISK_FAUCET_VERSION || config.lisk.version;
app.locals.liskMinVersion = process.env.LISK_FAUCET_MIN_VERSION || config.lisk.minVersion;
app.locals.passphrase = process.env.LISK_FAUCET_PASSPHRASE || config.lisk.passphrase;
app.locals.address = process.env.LISK_FAUCET_ADDRESS || config.lisk.address;
app.locals.amountToSend = Number(process.env.LISK_FAUCET_AMOUNT) || config.amount;
app.locals.cacheTTL = Number(process.env.LISK_FAUCET_TTL) || config.cacheTTL;

console.log(`Using Lisk Core at ${app.locals.host}:${app.locals.port}`);

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

if (process.env.CAPTCHA_PUBLICKEY && process.env.CAPTCHA_PRIVATEKEY) {
    app.locals.captcha.publicKey = process.env.CAPTCHA_PUBLICKEY
    app.locals.captcha.privateKey = process.env.CAPTCHA_PRIVATEKEY
}

api(app);
app.listen(app.get('port'), app.get('host'), function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("Server started at " + app.get('host') + ":" + app.get('port'));
    }
});
