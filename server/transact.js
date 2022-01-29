const ethers = require('ethers');
const utils = require('../lepton/dist/utils');
const config = require('../config');
const abi = require('../abi');

const provider = new ethers.providers.JsonRpcProvider(config.jsonRPC);
const wallet = new ethers.Wallet(config.relayerPrivateKey, provider);
const contract = new ethers.Contract('0x791532E6155E0F69cEE328B356C8B6A8DaFB9076', abi, provider);

async function getRelayerPublicKey() {
  return utils.babyjubjub.privateKeyToPublicKey(config.relayerPrivateKey);
}

async function transact(transaction) {
  console.log(`Extra ETH requested by client: ${transaction.value}`);

  // Simulate transaction via eth_call
  const simulateResult = await wallet.call(transaction);

  console.log(simulateResult);
}

module.exports = {
  getRelayerPublicKey,
  transact,
};
