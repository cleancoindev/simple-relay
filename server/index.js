const express = require('express');
const events = require('./events');
const { getRelayerPublicKey, transact } = require('./transact');

const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json(events());
});

app.get('/payment', (req, res) => {
  res.send(getRelayerPublicKey());
});

app.post('/', async (req, res) => {
  const tx = await transact(req.body);
  res.send(tx);
});

app.listen(port, () => {
  console.log(`Example app listening at http://0.0.0.0:${port}`);
});
