Using environment variables
This method is advised to use in Docker environment

Place a copy of ./env/_template file in the root directory and name it .env

Edit the content so it reflects your configuration

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
Run the server in the Docker environment
docker-compose up
Hint: You can also run it command-line or export all variables

eval $(cat env/devnet.env) node app.js