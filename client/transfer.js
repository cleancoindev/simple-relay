const ethers = require('ethers');
const levelup = require('levelup');
const leveldown = require('leveldown');
const artifacts = require('railgun-artifacts');
const { Lepton, ERC20Note, ERC20Transaction } = require('../lepton');
const utils = require('../lepton/dist/utils');
const config = require('../config');

const db = levelup(leveldown('./db'));

const provider = new ethers.providers.JsonRpcProvider(config.jsonRPC);
const wallet = new ethers.Wallet(config.clientPrivateKey, provider);

async function artifactsGetter(circuit) {
  if (circuit === 'erc20small') {
    return artifacts.small;
  }
  return artifacts.large;
}

async function main() {
  const lepton = new Lepton(db, artifactsGetter);
  lepton.loadNetwork(3, '0x791532E6155E0F69cEE328B356C8B6A8DaFB9076', provider, 11572393);
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
    '0x784dbb737703225a6d5defffc7b395d59e348e3d',
  );

  console.log('Generating proof...');

  const transaction = new ERC20Transaction('0x784dbb737703225a6d5defffc7b395d59e348e3d', 3);
  transaction.outputs = [output];

  const proof = await transaction.prove(
    lepton.prover,
    lepton.wallets[walletID],
    '00',
  );

  console.log('Created proof: ', proof);

  const tx = await lepton.contracts[3].transact([proof]);

  console.log('TXID: ', (await wallet.sendTransaction(tx)).hash);
}

main();
