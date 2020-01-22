const redis = require('redis');

let client;

const init = (port, host) => {
    client = redis.createClient(port, host);

    client.on('ready', () => {
        console.log(`Redis: Connection successfully established to ${host}:${port}`);
    });
    
    client.on('end', () => {
        console.log(`Redis: Connection terminated to to ${host}:${port}`);
    });
};

const getClient = () => client;

module.exports = {
    init,
    getClient,
};
