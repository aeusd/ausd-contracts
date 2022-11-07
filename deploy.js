const {AeSdk, Node, MemoryAccount, generateKeyPair} = require('@aeternity/aepp-sdk');
const { utils } = require('@aeternity/aeproject');

const fs = require('fs');
const path = require('path');

const OCStableCoin_CONTRACT_SOURCE = './contracts/OCStableAE.aes';

const url = 'https://testnet.aeternity.io';
const oracle_id = "ok_2WFXc6nrecXXfDRRxMqS3BEDYAmPpBE3NQ7jYeJJLsgRJeoDjK"
const intial_supply = 1000;

async function waitPrompt(message) {
    console.log(message)
    const keypress = async () => {
        process.stdin.setRawMode(true)
        return new Promise(resolve => process.stdin.once('data', () => {
          process.stdin.setRawMode(false)
          resolve()
        }))
    }
    await keypress()
}

const getKeyPair = (location) => {
    const keypairFile = path.resolve(__dirname, location);
    const persisted = fs.existsSync(keypairFile);
    if (persisted) {
      return JSON.parse(fs.readFileSync(keypairFile), "utf-8");
    } else {
      const keypair = generateKeyPair();
      fs.writeFileSync(keypairFile, JSON.stringify(keypair), "utf-8");
      return keypair;
    }
};

const init = async () => {
    let keypair = getKeyPair("./keystore.json");
    let client = new AeSdk({
    compilerUrl: "https://latest.compiler.aepps.com",
    nodes: [
        {
        name: 'node',
        instance: new Node(process.env.NODE_URL || url),
        }],
    interval: 50
    });
    await client.addAccount(new MemoryAccount({ keypair: keypair }), { select: true })
    return client;
}

const deploy = async () =>{
    let aeSdk = await init()
    await waitPrompt(`Address: ${await aeSdk.address()}\nHit Enter to continue.`)
    const fileSystem = utils.getFilesystem(OCStableCoin_CONTRACT_SOURCE);
    const source = utils.getContractContent(OCStableCoin_CONTRACT_SOURCE);
    let contract  = await aeSdk.getContractInstance({ source, fileSystem });
    const aci_path = path.resolve(__dirname, "./aci/OCStableAE.json");
    fs.writeFileSync(aci_path,JSON.stringify(contract._aci))
    console.log("aci: ./aci/OCStableAE.json")
    await contract.deploy([intial_supply, oracle_id])
    console.log(`Deployed Contract: ${contract.deployInfo.address}`)
}

deploy()
