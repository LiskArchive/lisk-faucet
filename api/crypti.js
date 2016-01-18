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
                        cb("Error, can't get balance, invalid status code or success/status");
                    }
                });
            },
            function (cb) {
                request({
                    url : req.lisk + "/api/blocks/getFee",
                    json : true
                }, function (err, resp, body) {
                    if (err) {
                        console.log("Can't get fee: ");
                        cb(err);
                    } else if (resp.statusCode == 200 && body.success == true) {
                        cb(null, body.fee);
                    } else {
                        cb("Error, can't get transaction, invalid status code or success/status");
                    }
                })
            }
        ], function (err, result) {
            if (err) {
                console.error(err);
                return res.json({ success : false });
            } else {
                var balance = result[0];
                var fee = result[2];
                var isPossibleToSend = false;

                if (app.amountToSend * req.fixedPoint + (app.amountToSend * req.fixedPoint / 100 * fee) <= balance) {
                    isPossibleToSend = true;
                }

                return res.json({ success : true , captcha_key : app.captcha.publicKey, balance : balance / req.fixedPoint, fee : fee, working : isPossibleToSend, amount : app.amountToSend, donation_address : app.address, totalCount : app.totalCount });
            }
        });
    });

    app.post("/api/sendCrypti", function (req, res) {
        var address = req.body.address,
            captcha_response = req.body.captcha,
            ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        if (!address || !captcha_response) {
            return res.json({ success : false, error : "invalid parameters" });
        }

        address = address.trim();

        if (address.indexOf('C') != address.length - 1 && address.indexOf('D') != address.length - 1) {
            return res.json({ success : false , error : "invalid address" });
        }

        var num = address.substring(0, address.length - 1);

        if (isNaN(num)) {
            return res.json({ success : false , error : "invalid address" });
        }

        async.parallel([
            function (cb) {
                req.redis.get(ip, function (err, value) {
					if (err) {
						console.error("Redis error: " + err);
						return cb("Internal error");
					} else if (value) {
						return cb("From ip address already received XCR");
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
						return cb("This address already received XCR")
					}

					return cb();
				});
            }
        ], function (err, values) {
            if (err) {
                return res.json({ success : false, error : err});
            } else {
				simple_recaptcha(app.captcha.privateKey, ip, captcha_response, function(err) {
                    if (!err) {
                        req.redis.set(ip, ip, function (err) {
                            if (err) {
                                console.error("Redis error: " + err);
                                return res.json({ success : false, error : "internal error" });
                            } else {
                                req.redis.send_command("EXPIRE", [ip, 60], function (err) {
                                    if (err) {
                                        console.error("Redis error: " + err);
                                        return res.json({ success : false, error : "internal error" });
                                    } else {
										req.redis.set(address, address, function (err) {
											if (err) {
												console.error("Redis error: " + err);
												return res.json({ success: false, error : "internal error" });
											}

											req.redis.send_command("EXPIRE", [address, 60], function (err) {
												if (err) {
													console.error("Redis error: " + err);
													return res.json({ success: false, error: "internal error"});
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
														console.error("Wallet is down: " + err);
														return res.json({ success : false, error: "internal server error" });
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
															return res.json({success: false, error: "not enough amount on faucet account"});
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
                        return res.json({ success : false, error : "invalid captcha, try again" });
                    }
                });
            }
        });
    });
}
