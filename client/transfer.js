const ethers = require('ethers');
const axios = require('axios');
const levelup = require('levelup');
const leveldown = require('leveldown');
const artifacts = require('railgun-artifacts');
const { Lepton, ERC20Note, ERC20Transaction } = require('../lepton');
const utils = require('../lepton/dist/utils');
const config = require('../config');

const db = levelup(leveldown('./db'));

const provider = new ethers.providers.JsonRpcProvider(config.jsonRPC);

async function artifactsGetter(circuit) {
  if (circuit === 'erc20small') {
    return artifacts.small;
  }
  return artifacts.large;
}

async function main() {
  const lepton = new Lepton(db, artifactsGetter);
  lepton.loadNetwork('0x791532E6155E0F69cEE328B356C8B6A8DaFB9076', provider, 11572393);
  const walletID = await lepton.createWalletFromMnemonic('00', config.leptonMnemonic);
  lepton.wallets[walletID].on('scanned', async () => {
    console.log((await lepton.wallets[walletID].balances(3)));
  });
  // eslint-disable-next-line no-promise-executor-return
  await new Promise((resolve) => lepton.wallets[walletID].once('scanned', resolve));

  const output = new ERC20Note(
    Lepton.decodeAddress(await lepton.wallets[walletID].getAddress(0, false)).publicKey,
    utils.babyjubjub.random(),
    '0xffff',
    '0x9cf8fe5091c82a2e8044a38b76140078d1a8c696',
  );

  console.log('Generating proof...');
  const transaction = new ERC20Transaction('0x9cf8fe5091c82a2e8044a38b76140078d1a8c696', 3);
  transaction.outputs = [output];
  const tx = await lepton.contracts[3].transact([await transaction.prove(
    lepton.prover,
    lepton.wallets[walletID],
    '00',
  )]);
  console.log(await axios.post('http://relayer.railgun.ch:3000', tx));
  console.log(`TXID: ${await axios.post('http://relayer.railgun.ch:3000', tx)}`);
}

main();
