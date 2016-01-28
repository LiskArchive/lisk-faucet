var request = require('request'),
    async = require('async'),
    simple_recaptcha = require('simple-recaptcha');

module.exports = function (app) {
    app.get("/api/getBase", function (req, res) {
        async.series([
            function (cb) {
                request({
                    url : req.lisk + "/api/accounts/getBalance?address=" + app.address,
                    json : true
                }, function (err, resp, body) {
                    if (err) {
                        console.error("Can't get balance: " + err);
                        cb(err);
                    } else if (resp.statusCode == 200 && body.success == true) {
                        cb(null, body.unconfirmedBalance);
                    } else {
                        cb("Error, can't get faucet balance, invalid status code or success/status");
                    }
                });
            },
            function (cb) {
                request({
                    url : req.lisk + "/api/blocks/getFee",
                    json : true
                }, function (err, resp, body) {
                    if (err) {
                        console.log("Can't get transaction fee: " + err);
                        cb(err);
                    } else if (resp.statusCode == 200 && body.success == true) {
                        cb(null, body.fee);
                    } else {
                        cb("Error, can't get transaction fee, invalid status code or success/status");
                    }
                })
            }
        ], function (err, result) {
            if (err) {
                console.error(err);
                return res.json({ success : false });
            } else {
                var balance    = result[0],
                    fee        = result[2],
                    hasBalance = false;

                if (app.amountToSend * req.fixedPoint + (app.amountToSend * req.fixedPoint / 100 * fee) <= balance) {
                    hasBalance = true;
                }

                return res.json({
                    success : true,
                    captchaKey : app.captcha.publicKey,
                    balance : balance / req.fixedPoint,
                    fee : fee,
                    hasBalance : hasBalance,
                    amount : app.amountToSend,
                    donation_address : app.address,
                    totalCount : app.totalCount
                });
            }
        });
    });

    app.post("/api/sendLisk", function (req, res) {
        var address = req.body.address,
            captcha_response = req.body.captcha,
            ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        if (!address || !captcha_response) {
            return res.json({ success : false, error : "Invalid parameters" });
        }

        address = address.trim();

        if (address.indexOf('C') != address.length - 1 && address.indexOf('D') != address.length - 1) {
            return res.json({ success : false , error : "Invalid address" });
        }

        var num = address.substring(0, address.length - 1);

        if (isNaN(num)) {
            return res.json({ success : false , error : "Invalid address" });
        }

        async.parallel([
            function (cb) {
                req.redis.get(ip, function (err, value) {
                    if (err) {
                        console.error("Redis error: " + err);
                        return cb("Internal error");
                    } else if (value) {
                        return cb("This IP address has already received LISK");
                    }

                    cb();
                });
            },
            function (cb) {
                req.redis.get(address, function (err, value) {
                    if (err) {
                        console.error("Redis error: " + err);
                        return cb("Internal error");
                    } else if (value) {
                        return cb("This account has already received LISK")
                    }

                    return cb();
                });
            }
        ], function (err, values) {
            if (err) {
                return res.json({ success : false, error : err });
            } else {
                simple_recaptcha(app.captcha.privateKey, ip, captcha_response, function (err) {
                    if (!err) {
                        req.redis.set(ip, ip, function (err) {
                            if (err) {
                                console.error("Redis error: " + err);
                                return res.json({ success : false, error : "Internal error" });
                            } else {
                                req.redis.send_command("EXPIRE", [ip, 60], function (err) {
                                    if (err) {
                                        console.error("Redis error: " + err);
                                        return res.json({ success : false, error : "Internal error" });
                                    } else {
                                        req.redis.set(address, address, function (err) {
                                            if (err) {
                                                console.error("Redis error: " + err);
                                                return res.json({ success: false, error : "Internal error" });
                                            }

                                            req.redis.send_command("EXPIRE", [address, 60], function (err) {
                                                if (err) {
                                                    console.error("Redis error: " + err);
                                                    return res.json({ success: false, error: "Internal error"});
                                                }

                                                request({
                                                    url : req.lisk + "/api/transactions",
                                                    method : "PUT",
                                                    json : true,
                                                    body : {
                                                        amount : app.amountToSend * req.fixedPoint,
                                                        secret : app.passphrase,
                                                        recipientId : address
                                                    }
                                                }, function (err, resp, body) {
                                                    if (err || resp.statusCode != 200) {
                                                        console.error("Lisk node is down: " + err);
                                                        return res.json({ success : false, error: "Internal error" });
                                                    } else {
                                                        if (body.success == true) {
                                                            req.redis.send_command("EXPIRE", [ip, app.cacheTTL], function (err) {
                                                                if (err) {
                                                                    console.error("Redis error: " + err);
                                                                }

                                                                req.redis.send_command("EXPIRE", [address, app.cacheTTL], function (err) {
                                                                    if (err) {
                                                                        console.error("Redis error: " + err);
                                                                    }

                                                                    app.totalCount++;
                                                                    return res.json({ success : true, txId : body.transactionId });
                                                                });
                                                            });
                                                        } else {
                                                            console.error("Can't send transaction: " + body);
                                                            return res.json({success: false, error: "Faucet funds have all been spent"});
                                                        }
                                                    }
                                                });
                                            })
                                        });
                                    }
                                });
                            }
                        });
                    }
                    else {
                        return res.json({ success : false, error : "Invalid captcha, please try again" });
                    }
                });
            }
        });
    });
}
