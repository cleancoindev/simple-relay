const ethers = require('ethers');
const levelup = require('levelup');
const leveldown = require('leveldown');
const artifacts = require('railgun-artifacts');
const { Lepton } = require('../lepton');
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
  // eslint-disable-next-line no-promise-executor-return
  await new Promise((resolve) => lepton.wallets[walletID].once('scanned', resolve));
  lepton.wallets[walletID].on('scanned', async () => {
    console.log((await lepton.wallets[walletID].balances(3)));
  });
}

main();
