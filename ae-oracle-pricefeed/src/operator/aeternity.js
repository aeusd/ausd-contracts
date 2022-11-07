const {Universal, Node, MemoryAccount, Crypto} = require('@aeternity/aepp-sdk');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const BigNumber = require("bignumber.js");

const url = 'https://testnet.aeternity.io/';

module.exports = class Aeternity {

  stopAwaitFunding = false;

  init = async () => {
    if (!this.client) {
      this.keypair = this.getKeyPair();
      this.client = await Universal({
        nodes: [
          {
            name: 'node',
            instance: await Node({
              url: process.env.NODE_URL || url,
            }),
          }],
        accounts: [MemoryAccount({keypair: this.keypair})],
      });
    }
  };

  getKeyPair = () => {
    const keypairFile = path.resolve(__dirname, "../../keystore.json");
    const persisted = fs.existsSync(keypairFile);
    if (persisted) {
      return JSON.parse(fs.readFileSync(keypairFile), "utf-8");
    } else {
      throw "Keypair not found!" 
    }
  };

  stopAwaitFundingCheck = () => {
    this.stopAwaitFunding = true;
  }

  atomsToAe = (atoms) => (new BigNumber(atoms)).dividedBy(new BigNumber(1000000000000000000));

  timeoutAwaitFunding = async (fundingAmount) => {
    if (!this.stopAwaitFunding) setTimeout(() => {
      this.awaitFunding(fundingAmount)
    }, 120 * 1000);
  }

  awaitFunding = async (fundingAmount) => {
    if (!this.client) throw "Client not initialized";

    if (new BigNumber(await this.client.getBalance(this.keypair.publicKey)).isLessThan(new BigNumber(fundingAmount).dividedBy(2))) {
      qrcode.generate(this.keypair.publicKey, {small: true});
      console.log("Fund Oracle Service Wallet", this.keypair.publicKey, this.atomsToAe(fundingAmount).toFixed(), "AE");
      await new Promise(resolve => {
        const interval = setInterval(async () => {
          if (new BigNumber(await this.client.getBalance(this.keypair.publicKey)).isGreaterThanOrEqualTo(fundingAmount)) {
            console.log("received funding");
            this.timeoutAwaitFunding(fundingAmount)
            clearInterval(interval);
            resolve(true);
          }
        }, 2000);
      });
    } else {
      this.timeoutAwaitFunding(fundingAmount)
    }
  };

};
