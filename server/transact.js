const ethers = require('ethers');
const utils = require('../lepton/dist/utils');
const config = require('../config');
const abi = require('../abi');

const provider = new ethers.providers.JsonRpcProvider(config.jsonRPC);
const wallet = new ethers.Wallet(config.relayerPrivateKey, provider);
const contract = new ethers.Contract('0x791532E6155E0F69cEE328B356C8B6A8DaFB9076', abi, provider);

const relayerPaymentPrivateKey = '';

async function getRelayerPublicKey() {
  return utils.babyjubjub.privateKeyToPublicKey(config.relayerPrivateKey);
}

async function transact(transaction) {
  // TODO: Implement multicall contract
  if (transaction.to !== contract.address) throw new Error('Contract address invalid');

  console.log(transaction);
  console.log(`Extra ETH requested by client: ${transaction.value || 0}`);

  // Simulate transaction via eth_call
  const gasEstimate = await wallet.estimateGas(transaction);

  console.log(`Transaction gas estimate: ${gasEstimate}`);

  const parsedTransaction = contract.interface.parseTransaction(transaction);

  if (parsedTransaction.name !== 'transact') throw new Error('Contract method invalid');

  // eslint-disable-next-line no-underscore-dangle
  parsedTransaction.args._transactions.forEach((railgunTx) => {
    // eslint-disable-next-line no-underscore-dangle
    railgunTx._commitmentsOut.forEach((note) => {
      const sharedKey = utils.babyjubjub.ecdh(
        relayerPaymentPrivateKey,
        utils.babyjubjub.packPoint(note.senderPubKey.map((el) => el.toHexString())),
      );
      console.log(sharedKey);
    });
  });
}

module.exports = {
  getRelayerPublicKey,
  transact,
};
