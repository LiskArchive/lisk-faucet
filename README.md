# Lisk Faucet

## Prerequisites

- Node.js + npm (https://github.com/nodesource/distributions)
- Redis (http://redis.io)

## Installation

1. Install node modules:

```
npm install
```

2. Start redis-server:

```
redis-server > /dev/null 2>&1 &
```

## Configuration

### Using environment variables

This method is advised to use in Docker environment

1. Place a copy of `./env/_template` file in the root directory and name it `.env`

2. Edit the content so it reflects your configuration

```bash
LISK_CORE_URL=http://localhost:4000
LISK_CORE_NETHASH=198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d
LISK_CORE_NETWORK_NAME=devnet
LISK_CORE_VERSION=
LISK_CORE_MIN_VERSION=
LISK_FAUCET_PASSPHRASE=wagon stock borrow episode laundry kitten salute link globe zero feed marble
LISK_FAUCET_ADDRESS=16313739661670634666L
LISK_FAUCET_AMOUNT=1
LISK_FAUCET_TTL=1
LISK_EXPLORER_URL=https://localhost:6040
REDIS_HOST=localhost
REDIS_PORT=6379
CAPTCHA_PUBLICKEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
CAPTCHA_PRIVATEKEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

3. Run the server in the Docker environment

```
docker-compose up
```

> **Hint**: You can also run it command-line or export all variables
>
> ```bash
> eval $(cat env/devnet.env) node app.js
> ```

### Using `config.json`

Open `config.json` and complete the following details.

1. Edit your [reCaptcha](https://www.google.com/recaptcha/) public/private keypair:

  ```js
  "captcha" : {
      "publicKey" : "",     // <-- Your publicKey
      "privateKey" : ""     // <-- Your privateKey
  }
  ```

  **NOTE:** There are two separate keypairs for development and production environments.

2. Edit your Lisk connection details:

  ```js
  "lisk" : {
      "network_name": "devnet",
      "url" : "http://127.0.0.1:4000", // <-- Lisk Core URL (7000 for testnet)
      "passphrase" : "",    // <-- Passphrase of faucet account
      "address" : ""        // <-- Address of faucet account
      "nethash": "",        // <-- Nethash of the network
      "version": "0.0.0a",  // <-- Expected version of lisk-core end point
      "minVersion": "0.0.0" // <-- Minimal version of lisk-core that will be accepted
  }
  ```

3. _(optional)_ Add Explorer URL:

  ```js
  "explorerUrl": "http://localhost:6040",
  ```

4. Edit your Redis connection details:

  ```js
  "redis" : {
      "host" : "127.0.0.1", // <-- Redis server host (default: 127.0.0.1)
      "port" : 6379,        // <-- Redis server port (default: 6379)
  }
  ```

5. Edit the faucet amount:

  ```js
  { "amount" : 1 }          // <-- Amount sent by faucet (default: 1)
  ```

## 

## Launch

Development:

```
node app.js
```

Open: [http://localhost:3000](http://localhost:3000)

Production:

```
NODE_ENV=production node app.js
```

Open: [http://localhost:3200](http://localhost:3200)

## Get Involved

| Reason                          | How                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Want to chat with our community | [Reach them on Discord](https://discord.gg/lisk)                                               |
| Found a bug                     | [Open a new issue](https://github.com/LiskHQ/lisk/issues/new)                                  |
| Found a security issue          | [See our bounty program](https://blog.lisk.io/announcing-lisk-bug-bounty-program-5895bdd46ed4) |
| Want to share your research     | [Propose your research](https://research.lisk.io)                                              |
| Want to develop with us         | [Create a fork](https://github.com/LiskHQ/lisk/fork)                                           |

## Contributors

https://github.com/LiskHQ/lisk-service/graphs/contributors

## License

The MIT License (MIT)

Copyright (c) 2016-2017 Lisk  
Copyright (c) 2014-2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
