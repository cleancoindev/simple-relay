const ethers = require('ethers');
const levelup = require('levelup');
const leveldown = require('leveldown');
const artifacts = require('railgun-artifacts');
const { Lepton, ERC20Note } = require('../lepton');
const utils = require('../lepton/dist/utils');
const config = require('../config');
const erc20abi = require('../erc20abi');

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

  const token = new ethers.Contract('0x9cf8fe5091c82a2e8044a38b76140078d1a8c696', erc20abi, wallet);
  const balance = await token.balanceOf(wallet.address);
  await (await token.approve('0x791532E6155E0F69cEE328B356C8B6A8DaFB9076', balance)).wait();

  const tx = await lepton.contracts[3].generateDeposit([output]);
  console.log(`TXID: ${(await wallet.sendTransaction(tx)).hash}`);

  // eslint-disable-next-line no-promise-executor-return
  await new Promise((resolve) => lepton.wallets[walletID].once('scanned', resolve));
  console.log(`Balance: ${(await lepton.wallets[walletID].balances(3))['0000000000000000000000009cf8fe5091c82a2e8044a38b76140078d1a8c696'].balance.toString()}`);
}

main();