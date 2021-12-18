const express = require('express');
const ethers = require('ethers');
const config = require('../config');
const abi = require('../abi');

const app = express();
const port = 3000;

const provider = new ethers.providers.JsonRpcProvider(config.jsonRPC);
const wallet = new ethers.Wallet(config.relayerPrivateKey, provider);
const contract = new ethers.Contract('0x791532E6155E0F69cEE328B356C8B6A8DaFB9076', abi, provider);

const events = [];

async function getEvents() {
  contract.on(
    'GeneratedCommitmentBatch',
    (
      treeNumber,
      startPosition,
      commitments,
      event,
    ) => {
      events.push({
        treeNumber: treeNumber.toNumber(),
        startPosition: startPosition.toNumber(),
        commitments,
        txid: event.transactionHash,
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
      events.push({
        treeNumber: treeNumber.toNumber(),
        startPosition: startPosition.toNumber(),
        commitments,
        txid: event.transactionHash,
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
    events.push(
      // eslint-disable-next-line no-await-in-loop
      ...(await contract.queryFilter(
        contract.filters.GeneratedCommitmentBatch(),
        currentStartBlock,
        currentStartBlock + SCAN_CHUNKS,
      )).map((el) => {
        const event = {
          txid: el.transactionHash,
          treeNumber: el.args.treeNumber.toHexString(),
          startPosition: el.args.startPosition.toHexString(),
          commitments: el.args.commitments.map((commitment) => ({
            pubkey: commitment.pubkey.map((el2) => el2.toHexString()),
            random: commitment.random.toHexString(),
            amount: commitment.amount.toHexString(),
            token: commitment.token,
          })),
        };
        return event;
      }),
    );
    events.push(
      // eslint-disable-next-line no-await-in-loop
      ...(await contract.queryFilter(
        contract.filters.CommitmentBatch(),
        currentStartBlock,
        currentStartBlock + SCAN_CHUNKS,
      )).map((el) => {
        const event = {
          txid: el.transactionHash,
          treeNumber: el.args.treeNumber.toHexString(),
          startPosition: el.args.startPosition.toHexString(),
          commitments: el.args.commitments.map((commitment) => {
            const ciphertexthexlified = commitment.ciphertext.map((el2) => el2.toHexString());
            return {
              hash: commitment.hash.toHexString(),
              txid: el.transactionHash,
              senderPublicKey: commitment.senderPubKey.map((el2) => el2.toHexString()),
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
    console.log(`Scanned blocks ${currentStartBlock} - ${currentStartBlock + SCAN_CHUNKS}`);
    currentStartBlock += SCAN_CHUNKS;
  }
  console.log('Scanning complete');
}

getEvents();

app.use(express.json());

app.get('/', (req, res) => {
  res.json(events);
});

app.post('/', async (req, res) => {
  const tx = await wallet.sendTransaction(req.body);
  res.send(tx);
});

app.listen(port, () => {
  console.log(`Example app listening at http://0.0.0.0:${port}`);
});
