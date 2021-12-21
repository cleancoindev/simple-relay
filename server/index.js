const express = require('express');
const ethers = require('ethers');
const utils = require('../lepton/dist/utils');
const config = require('../config');
const abi = require('../abi');

const app = express();
const port = 3000;

const provider = new ethers.providers.JsonRpcProvider(config.jsonRPC);
const wallet = new ethers.Wallet(config.relayerPrivateKey, provider);
const contract = new ethers.Contract('0x791532E6155E0F69cEE328B356C8B6A8DaFB9076', abi, provider);

const commitmentevents = [];
const nullifierevents = [];

async function getEvents() {
  contract.on(
    'GeneratedCommitmentBatch',
    (
      treeNumber,
      startPosition,
      commitments,
      event,
    ) => {
      commitmentevents.push({
        treeNumber: treeNumber.toNumber(),
        startPosition: startPosition.toNumber(),
        commitments: commitments.map((commitment) => ({
          pubkey: utils.babyjubjub.packPoint(
            commitment.pubkey.map((el2) => el2.toHexString()),
          ),
          random: utils.bytes.hexlify(commitment.random.toHexString()),
          amount: utils.bytes.hexlify(commitment.amount.toHexString()),
          token: utils.bytes.hexlify(commitment.token),
        })),
        txid: utils.bytes.hexlify(event.transactionHash),
      });
    },
  );

  contract.on(
    'CommitmentBatch',
    (
      treeNumber,
      startPosition,
      commitments,
      event,
    ) => {
      commitmentevents.push({
        treeNumber: treeNumber.toNumber(),
        startPosition: startPosition.toNumber(),
        commitments: commitments.map((commitment) => {
          const ciphertexthexlified = commitment.ciphertext.map(
            (el2) => utils.bytes.hexlify(el2.toHexString()),
          );
          return {
            hash: utils.bytes.hexlify(commitment.hash.toHexString()),
            txid: utils.bytes.hexlify(event.transactionHash),
            senderPublicKey: utils.babyjubjub.packPoint(
              commitment.senderPubKey.map((el2) => el2.toHexString()),
            ),
            ciphertext: {
              iv: ciphertexthexlified[0],
              data: ciphertexthexlified.slice(1),
            },
          };
        }),
        txid: utils.bytes.hexlify(event.transactionHash),
      });
    },
  );

  contract.on(
    'Nullifier',
    (
      nullifier,
      event,
    ) => {
      nullifierevents.push({
        txid: utils.bytes.hexlify(event.transactionHash),
        nullifier: utils.bytes.hexlify(nullifier.toHexString()),
      });
    },
  );

  const SCAN_CHUNKS = 500;
  const startScanningBlock = 11572393;
  const latest = (await contract.provider.getBlock('latest')).number;
  let currentStartBlock = startScanningBlock;
  console.log(`Latest block: ${latest}`);

  // Process chunks of blocks at a time
  while (currentStartBlock < latest) {
    // Loop through each list of events and push to array
    commitmentevents.push(
      // eslint-disable-next-line no-await-in-loop
      ...(await contract.queryFilter(
        contract.filters.GeneratedCommitmentBatch(),
        currentStartBlock,
        currentStartBlock + SCAN_CHUNKS,
      )).map((el) => {
        const event = {
          txid: utils.bytes.hexlify(el.transactionHash),
          treeNumber: el.args.treeNumber.toNumber(),
          startPosition: el.args.startPosition.toNumber(),
          commitments: el.args.commitments.map((commitment) => ({
            pubkey: utils.babyjubjub.packPoint(
              commitment.pubkey.map((el2) => el2.toHexString()),
            ),
            random: utils.bytes.hexlify(commitment.random.toHexString()),
            amount: utils.bytes.hexlify(commitment.amount.toHexString()),
            token: utils.bytes.hexlify(commitment.token),
          })),
        };
        return event;
      }),
    );
    commitmentevents.push(
      // eslint-disable-next-line no-await-in-loop
      ...(await contract.queryFilter(
        contract.filters.CommitmentBatch(),
        currentStartBlock,
        currentStartBlock + SCAN_CHUNKS,
      )).map((el) => {
        const event = {
          txid: utils.bytes.hexlify(el.transactionHash),
          treeNumber: el.args.treeNumber.toNumber(),
          startPosition: el.args.startPosition.toNumber(),
          commitments: el.args.commitments.map((commitment) => {
            const ciphertexthexlified = commitment.ciphertext.map(
              (el2) => utils.bytes.hexlify(el2.toHexString()),
            );
            return {
              hash: utils.bytes.hexlify(commitment.hash.toHexString()),
              txid: utils.bytes.hexlify(el.transactionHash),
              senderPublicKey: utils.babyjubjub.packPoint(
                commitment.senderPubKey.map((el2) => el2.toHexString()),
              ),
              ciphertext: {
                iv: ciphertexthexlified[0],
                data: ciphertexthexlified.slice(1),
              },
            };
          }),
        };
        return event;
      }),
    );
    nullifierevents.push(
      // eslint-disable-next-line no-await-in-loop
      ...(await contract.queryFilter(
        contract.filters.Nullifier(),
        currentStartBlock,
        currentStartBlock + SCAN_CHUNKS,
      )).map((el) => {
        const event = {
          txid: utils.bytes.hexlify(el.transactionHash),
          nullifier: utils.bytes.hexlify(el.args.nullifier.toHexString()),
        };
        return event;
      }),
    );
    console.log(`Scanned blocks ${currentStartBlock} - ${currentStartBlock + SCAN_CHUNKS}`);
    currentStartBlock += SCAN_CHUNKS;
  }
  console.log('Scanning complete');
}

getEvents();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    commitmentevents,
    nullifierevents,
  });
});

app.post('/', async (req, res) => {
  req.body.value = 0;
  const tx = await wallet.sendTransaction(req.body);
  res.send(tx);
});

app.listen(port, () => {
  console.log(`Example app listening at http://0.0.0.0:${port}`);
});
