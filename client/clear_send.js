const ethers = require('ethers');
const config = require('../config');
const erc20abi = require('../erc20abi');

const provider = new ethers.providers.JsonRpcProvider(config.jsonRPC);
const wallet = new ethers.Wallet(config.clientPrivateKey, provider);

async function main() {
  const token = new ethers.Contract('0x784dbb737703225a6d5defffc7b395d59e348e3d', erc20abi, wallet);
  const tx = await token.transfer('0x95abda53bc5e9fbbdce34603614018d32ced219e', '100');
  console.log('TXID: ', tx.hash);
}

main();
