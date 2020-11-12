var express = require('express'),
    config = require('./config.json').configuration,
    development = config.development,
    production = config.production,
    redisClient = require('./api/redis'),
    path = require('path'),
    api = require('./api'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    compression = require('compression');

redisClient.init(
    Number(process.env.REDIS_PORT) || config.redis.port,
    process.env.REDIS_HOST || config.redis.host
);

const client = redisClient.getClient();

var app = express();

client.debug_mode = true;

app.set('strict routing', true);

app.locals.liskUrl = process.env.LISK_CORE_URL || config.lisk.url;
app.locals.nethash = process.env.LISK_CORE_NETHASH || config.lisk.nethash;
app.locals.network_name = process.env.LISK_CORE_NETWORK_NAME || config.lisk.network_name;
app.locals.liskVersion = process.env.LISK_CORE_VERSION || config.lisk.version;
app.locals.liskMinVersion = process.env.LISK_CORE_MIN_VERSION || config.lisk.minVersion;
app.locals.passphrase = process.env.LISK_FAUCET_PASSPHRASE || config.lisk.passphrase;
app.locals.address = process.env.LISK_FAUCET_ADDRESS || config.lisk.address;
app.locals.amountToSend = Number(process.env.LISK_FAUCET_AMOUNT) || config.amount;
app.locals.cacheTTL = Number(process.env.LISK_FAUCET_TTL) || config.cacheTTL;
app.locals.explorerUrl = process.env.LISK_EXPLORER_URL || config.explorerUrl;

app.set("lisk address", app.locals.liskUrl);
app.set("lisk network", 'unknown');

console.log(`Using Lisk Core at ${app.locals.liskUrl}`);

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

app.use(express.static(path.join(__dirname, "public")));
app.use(compression());
app.use(methodOverride());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
