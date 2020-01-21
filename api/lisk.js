const request = require('request'),
    async = require('async'),
    redis = require('./redis'),
    simple_recaptcha = require('simple-recaptcha'),
    packageJson = require('../package.json');

// const APIClient = require('@liskhq/lisk-api-client');
// const transactions = require('@liskhq/lisk-transactions');
// const cryptogrphy = require('@liskhq/lisk-cryptography');

const { APIClient, transactions } = require('lisk-elements');

const getApiClient = (app) => {
    return new APIClient(
        [ app.locals.liskUrl ],
        {
            client: {
                name: 'Lisk Faucet',
                version: packageJson.version,
            },
            nethash: app.locals.nethash,
            // node: app.locals.liskUrl,
            // randomizeNodes: false,
        }
    );
};

module.exports = function (app) {
    app.get("/api/getBase", function (req, res) {
        const apiClient = getApiClient(app);

        async.series([
            function (cb) {
                apiClient.accounts.get({ address: app.locals.address }).then(accounts => {
                    cb(null, accounts.data[0].balance);
                }).catch(err => {
                    cb("Failed to get faucet balance");
                });
            },
            function (cb) {
                apiClient.node.getConstants()
                    .then(constants => {
                        cb(null, constants.data.fees.send);
                    }).catch(err => {
                        cb("Failed to establish transaction fee");
                    });
            }
        ], function (error, result) {
            if (error) {
                return res.json({ success : false, error : error });
            } else {
                var balance    = result[0],
                    fee        = result[2],
                    hasBalance = false;

                if (app.locals.amountToSend * req.fixedPoint + (app.locals.amountToSend * req.fixedPoint / 100 * fee) <= balance) {
                    hasBalance = true;
                }

                return res.json({
                    success : true,
                    captchaKey : app.locals.captcha.publicKey,
                    balance : balance / req.fixedPoint,
                    fee : fee,
                    hasBalance : hasBalance,
                    amount : app.locals.amountToSend,
                    donation_address : app.locals.address,
                    totalCount : app.locals.totalCount,
                    network : app.set("lisk network")
                });
            }
        });
    });

    app.post("/api/sendLisk", function (req, res) {
        var error = null,
            address = req.body.address,
            captcha_response = req.body.captcha,
            ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        if (!address) { error = "Missing Lisk ID"; }

        if (!captcha_response) { error = "Captcha validation failed, please try again"; }

        if (address) {
            address = address.trim();

            if (address.indexOf('L') != address.length - 1 && address.indexOf('D') != address.length - 1) {
                error = "Invalid Lisk ID";
            }

            var num = address.substring(0, address.length - 1);
            if (isNaN(num)) { error = "Invalid Lisk ID"; }
        }

        if (error) {
            return res.json({ success : false, error : error });
        }

        var parallel = {
            authenticateIP : function (cb) {
                redis.getClient().get(ip, function (error, value) {
                    if (error) {
                        return cb("Failed to authenticate IP address");
                    } else if (value) {
                        return cb("This IP address has already received LSK");
                    } else {
                        return cb(null);
                    }
                });
            },
            authenticateAddress : function (cb) {
                redis.getClient().get(address, function (error, value) {
                    if (error) {
                        return cb("Failed to authenticate Lisk ID");
                    } else if (value) {
                        return cb("This account has already received LSK");
                    } else {
                        return cb(null);
                    }
                });
            }
        }

        var series = {
            validateCaptcha : function (cb) {
                simple_recaptcha(app.locals.captcha.privateKey, ip, captcha_response, function (error) {
                    if (error) {
                        return cb("Captcha validation failed, please try again");
                    } else {
                        return cb(null);
                    }
                });
            },
            cacheIP : function (cb) {
                redis.getClient().set(ip, ip, 'EX', app.locals.cacheTTL, function (error) {
                    if (error) {
                        return cb("Failed to cache IP address");
                    } else {
                        return cb(null);
                    }
                });
            },
            cacheAddress : function (cb) {
                redis.getClient().set(address, address, 'EX', app.locals.cacheTTL, function (error) {
                    if (error) {
                        return cb("Failed to cache Lisk ID");
                    } else {
                        return cb(null);
                    }
                });
            },
            sendTransaction : function (cb) {
                var amount      = app.locals.amountToSend * req.fixedPoint;
                var transaction = transactions.transfer(
                    {
                        recipientId: address,
                        amount: String(amount),
                        passphrase: app.locals.passphrase,
                    }
                );

                const apiClient = getApiClient(app);
                apiClient.transactions.broadcast(transaction).then(transaction => {
                    return cb(null, transaction.data);
                }).catch(err => {
                    console.log(err.message);
                    return cb("Failed to send transaction");
                });
            },
        };

        async.parallel([
            parallel.authenticateIP,
            parallel.authenticateAddress
        ], function (error, values) {
            if (error) {
                return res.json({ success : false, error : error });
            } else {
                async.series([
                    series.validateCaptcha,
                    series.cacheIP,
                    series.cacheAddress,
                    series.sendTransaction,
                ], function (error, results) {
                    if (error) {
                        return res.json({ success : false, error : error });
                    } else {
                        return res.json({ success : true, txId : 'unknown' });
                    }
                });
            }
        });
    });
}
