var request = require('request'),
    async = require('async'),
    simple_recaptcha = require('simple-recaptcha');

module.exports = function (app) {
    app.get("/api/getBase", function (req, res) {
        async.series([
            function (cb) {
                request({
                    url : req.lisk + "/api/accounts/getBalance?address=" + app.locals.address,
                    json : true
                }, function (error, resp, body) {
                    if (error || resp.statusCode != 200 || !body.success) {
                        return cb("Failed to get faucet balance");
                    } else {
                        return cb(null, body.unconfirmedBalance);
                    }
                });
            },
            function (cb) {
                request({
                    url : req.lisk + "/api/blocks/getFee",
                    json : true
                }, function (error, resp, body) {
                    if (error || resp.statusCode != 200 || !body.success) {
                        return cb("Failed to establish transaction fee");
                    } else {
                        return cb(null, body.fee);
                    }
                })
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
                req.redis.get(ip, function (error, value) {
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
                req.redis.get(address, function (error, value) {
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
                req.redis.set(ip, ip, function (error) {
                    if (error) {
                        return cb("Failed to cache IP address");
                    } else {
                        return cb(null);
                    }
                });
            },
            sendIPExpiry : function (cb) {
                req.redis.send_command("EXPIRE", [ip, 60], function (error) {
                    if (error) {
                        return cb("Failed to send IP address expiry");
                    } else {
                        return cb(null);
                    }
                });
            },
            cacheAddress : function (cb) {
                req.redis.set(address, address, function (error) {
                    if (error) {
                        return cb("Failed to cache Lisk ID");
                    } else {
                        return cb(null);
                    }
                });
            },
            sendAddressExpiry : function (cb) {
                req.redis.send_command("EXPIRE", [address, 60], function (error) {
                    if (error) {
                        return cb("Failed to send Lisk ID expiry");
                    } else {
                        return cb(null);
                    }
                });
            },
            sendTransaction : function (cb) {
                request({
                    url : req.lisk + "/api/transactions",
                    method : "PUT",
                    json : true,
                    body : {
                        amount : app.locals.amountToSend * req.fixedPoint,
                        secret : app.locals.passphrase,
                        recipientId : address
                    }
                }, function (error, resp, body) {
                    if (error || resp.statusCode != 200 || !body.success) {
                        return cb("Failed to send transaction");
                    } else {
                        return cb(null, body);
                    }
                });
            },
            expireIPs : function (cb) {
                req.redis.send_command("EXPIRE", [ip, app.locals.cacheTTL], function (error) {
                    return cb(error);
                });
            },
            expireAddresses : function (cb) {
                req.redis.send_command("EXPIRE", [address, app.locals.cacheTTL], function (error) {
                    return cb(error);
                });
            }
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
                    series.sendIPExpiry,
                    series.cacheAddress,
                    series.sendAddressExpiry,
                    series.sendTransaction,
                    series.expireIPs,
                    series.expireAddresses
                ], function (error, results) {
                    if (error) {
                        return res.json({ success : false, error : error });
                    } else {
                        app.locals.totalCount++;
                        return res.json({ success : true, txId : results[5].transactionId });
                    }
                });
            }
        });
    });
}
