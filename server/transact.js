const ethers = require('ethers');
const BN = require('bn.js');
const utils = require('../lepton/dist/utils');
const { ERC20Note } = require('../lepton/dist/note');
const config = require('../config');
const abi = require('../abi');

const provider = new ethers.providers.JsonRpcProvider(config.jsonRPC);
const wallet = new ethers.Wallet(config.relayerPrivateKey, provider);
const contract = new ethers.Contract('0x791532E6155E0F69cEE328B356C8B6A8DaFB9076', abi, provider);

const relayerPaymentPrivateKey = '0f75f0f0f1e2d1021b1d7f839bea176d24c87e089ee959c6fb9c0e650473d684';
const relayerPaymentPublicKey = utils.babyjubjub.privateKeyToPubKey(relayerPaymentPrivateKey);
// Public Key: f0778519e8392743ac51cfb56d3e58d0aa3a78bda158f5a2adbd2d57615fcb0e
// Address: rgany1q8c80pgeaqujwsav288m2mf7trg25wnchks43adz4k7j64mptl9sun7g7an

async function getRelayerPublicKey() {
  return relayerPaymentPublicKey;
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

  const payments = {};

  // eslint-disable-next-line no-underscore-dangle
  parsedTransaction.args._transactions.forEach((railgunTx) => {
    // eslint-disable-next-line no-underscore-dangle
    railgunTx._commitmentsOut.forEach((note) => {
      const sharedKey = utils.babyjubjub.ecdh(
        relayerPaymentPrivateKey,
        utils.babyjubjub.packPoint(note.senderPubKey.map((el) => el.toHexString())),
      );

      const ciphertexthexlified = note.ciphertext.map((el) => el.toHexString());

      const decryptedNote = ERC20Note.decrypt(
        {
          iv: ciphertexthexlified[0],
          data: ciphertexthexlified.slice(1),
        },
        sharedKey,
      );

      if (decryptedNote.pubkey === relayerPaymentPublicKey) {
        if (`0x${decryptedNote.hash}` !== note.hash.toHexString())
          throw new Error('Client attempted to steal from relayer via invalid ciphertext');

        if (!payments[decryptedNote.token]) payments[decryptedNote.token] = new BN(0);

        payments[decryptedNote.token] = payments[decryptedNote.token].add(utils.bytes.numberify(decryptedNote.amount));
      }
    });
  });

  Object.keys(payments).forEach((key) => {
    payments[key] = payments[key].toNumber();
  });

  console.log(`Payments: ${JSON.stringify(payments)}`);

  return wallet.sendTransaction(transaction);
}

module.exports = {
  getRelayerPublicKey,
  transact,
};
