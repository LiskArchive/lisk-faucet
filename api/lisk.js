const redis = require('./redis');
const simple_recaptcha = require('simple-recaptcha');
const {
    apiClient,
    cryptography,
    transactions,
} = require('@liskhq/lisk-client');

const MINIMUM_FEE = '1000000';

const getFromRedis = async value => {
    const result = await new Promise((resolve, reject) => {
        redis.getClient().get(value, (err, result) => {
            if (err) {
                return reject(err);
            }
            return resolve(result);
        });
    });
    return result;
};

module.exports = function (app) {
    app.get("/api/getBase", async function (req, res) {
        try {
            const client = await apiClient.createWSClient(app.locals.liskUrl);
            const account = await client.account.get(cryptography.getAddressFromBase32Address(app.locals.address));
            const fee = BigInt(MINIMUM_FEE);
            const totalAmount = BigInt(transactions.convertLSKToBeddows(String(app.locals.amountToSend))) + fee;
            const hasBalance = account.token.balance >= totalAmount;
            return res.json({
                success: true,
                captchaKey: app.locals.captcha.publicKey,
                balance: transactions.convertBeddowsToLSK(account.token.balance.toString()),
                fee: fee.toString(),
                hasBalance: hasBalance,
                amount: app.locals.amountToSend,
                donation_address: app.locals.address,
                network: app.locals.network_name,
                explorerUrl: app.locals.explorerUrl,
            });
        } catch (error) {
            res.json({ success: false, error: error.message });
        }
    });

    app.post("/api/sendLisk", async function (req, res) {
        const { address, captcha: captcha_response } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress; 
        if (!address) {
            return res.json({ success: false, error: 'Missing Lisk Address' });
        }
        if (!captcha_response) {
            return res.json({ success: false, error: 'Captcha validation failed, please try again' });
        }
        if (!cryptography.validateBase32Address(address)) {
            return res.json({ success: false, error: 'Invalid Lisk Address' });
        }
        try {
            const result = await getFromRedis(ip);
            if (result) {
                return res.json({ success: false, error: 'This IP address has already received LSK' });
            }
        } catch (error) {
            return res.json({ success: false, error: 'Failed to authenticate IP address' });
        }
        try {
            const result = await getFromRedis(address);
            if (result) {
                return res.json({ success: false, error: 'This account has already received LSK' });
            }
        } catch (error) {
            return res.json({ success: false, error: 'Failed to authenticate Lisk address' });
        }

        try {
            await new Promise((resolve, reject) => {
                simple_recaptcha(app.locals.captcha.privateKey, ip, captcha_response, function (error) {
                    if (error) {
                        return reject(new Error('Captcha validation failed, please try again'));
                    }
                    return resolve();
                });
            });
            await redis.getClient().set(ip, ip, 'EX', app.locals.cacheTTL);
            await redis.getClient().set(address, address, 'EX', app.locals.cacheTTL);
            const client = await apiClient.createWSClient(app.locals.liskUrl);
            await client.account.get(cryptography.getAddressFromBase32Address(app.locals.address));
            const amount = BigInt(transactions.convertLSKToBeddows(String(app.locals.amountToSend)));
            const tx = await client.transaction.create({
                moduleName: 'token',
                assetName: 'transfer',
                fee: BigInt(MINIMUM_FEE),
                asset: {
                    recipientAddress: cryptography.getAddressFromBase32Address(address),
                    amount,
                    data: '',
                },
            }, app.locals.passphrase);
            await client.transaction.send(tx);
            res.json({
                success: true,
                message: 'Successfully sent transaction',
            });
        } catch (error) {
            return res.json({ success: false, error: error.message });
        }
    });
}
