const PriceFeedOracle = require("./priceFeedOracle")
const express = require('express')

const app = express()

const main = async () => {
  const priceFeedOracle = new PriceFeedOracle();
  await priceFeedOracle.init();
  await priceFeedOracle.register();
  priceFeedOracle.startPolling();
  app.get('/', (req, res) => {
    res.send('Hello World!')
  })
  app.listen(process.env.PORT || 3000, () => {
    console.log(`Example app listening on port ${process.env.PORT || 3000}`)
  })
};

main();
