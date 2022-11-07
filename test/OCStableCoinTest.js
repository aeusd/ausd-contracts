const { assert } = require('chai');
const { utils } = require('@aeternity/aeproject');
const {toAettos} = require('@aeternity/aepp-sdk');
const fs = require('fs');
const path = require('path');

const OCStableCoin_CONTRACT_SOURCE = './contracts/OCStableAE.aes';
const OCStableCoin_aex9_CONTRACT_SOURCE = './contracts/AEX9.aes';

describe('OCStableCoin', () => {
  let aeSdk;
  let contract;
  let contract_aex9;
  let source_aex9;
  let oracle_id = "ok_gLYH5tAexTCvvQA6NpXksrkPJKCkLnB9MTDFTVCBuHNDJ3uZv"
  const intial_supply = 1000;

  before(async () => {
    aeSdk = await utils.getSdk();
    // a filesystem object must be passed to the compiler if the contract uses custom includes
    const fileSystem = utils.getFilesystem(OCStableCoin_CONTRACT_SOURCE);

    // get content of contract
    const source = utils.getContractContent(OCStableCoin_CONTRACT_SOURCE);
    source_aex9 = utils.getContractContent(OCStableCoin_aex9_CONTRACT_SOURCE);




    // initialize the contract instance
    contract = await aeSdk.getContractInstance({ source, fileSystem });
    await contract.deploy([intial_supply, oracle_id]);

    const aci_path = path.resolve(__dirname, "../aci/OCStableAE.json");
    fs.writeFileSync(aci_path,JSON.stringify(contract._aci))

    // create a snapshot of the blockchain state
    await utils.createSnapshot(aeSdk);
  });

  // after each test roll back to initial state
  afterEach(async () => {
    await utils.rollbackSnapshot(aeSdk);
  });

  it('OCStableCoin: init', async () => {
    console.log(`---------------------OCStableCoin: init--------------------------------`)
    
    let wallet_address = await utils.getDefaultAccounts()[0].address()

    let OCStableCoin_aex9_address = (await contract.methods.get_token_address()).decodedResult;
    contract_aex9 =  await aeSdk.getContractInstance({ source: source_aex9, contractAddress:  OCStableCoin_aex9_address.replace("ak_", "ct_")});
    
    const aci_path = path.resolve(__dirname, "../aci/AEX9.json");
    fs.writeFileSync(aci_path,JSON.stringify(contract_aex9._aci))

    let balance = (await contract_aex9.methods.balance(wallet_address)).decodedResult;
    assert.equal(balance, intial_supply)
  });

  /*it('OCStableCoin: create_loan_application, borrow and withdraw', async () => {
    console.log(`---------------------OCStableCoin: create_loan_application-------------`)
    let wallet_address = await utils.getDefaultAccounts()[2].address()
    let loan_application = (await contract.methods.create_loan_application( toAettos(1000), { onAccount: utils.getDefaultAccounts()[2], amount: 200000000000000 })).decodedResult;
    
    console.log(`---------------------OCStableCoin: borrow------------------------------`)
    let query = await aeSdk.getQueryObject(oracle_id, loan_application.oquery)
    let aeusd_total = await query.pollForResponse()
    let ausd =  parseInt(aeusd_total*0.7)
    await contract.methods.borrow(loan_application.loan_id, { onAccount: utils.getDefaultAccounts()[2], amount: toAettos(1000) })
    let balance = (await contract_aex9.methods.balance(wallet_address)).decodedResult;
    assert.equal(balance, ausd)
    
    console.log(`---------------------OCStableCoin: withdraw----------------------------`)
    await contract_aex9.methods.transfer(wallet_address,parseInt(aeusd_total-ausd), { onAccount: utils.getDefaultAccounts()[0] })
    await contract_aex9.methods.create_allowance(contract.deployInfo.address.replace("ct_","ak_"), aeusd_total, { onAccount: utils.getDefaultAccounts()[2] })
    await contract.methods.withdraw(loan_application.loan_id, { onAccount: utils.getDefaultAccounts()[2] })
    let balance1 = (await contract_aex9.methods.balance(wallet_address)).decodedResult;
    assert.isTrue(balance1 <= 1)
  });*/
  
  it('OCStableCoin: liquidate loan', async () => {
    console.log(`---------------------OCStableCoin: liquidate_loan init------------------------------`)
    let wallet_address = await utils.getDefaultAccounts()[3].address()
    let loan_application = (await contract.methods.create_loan_application( toAettos(1000), { onAccount: utils.getDefaultAccounts()[3], amount: 200000000000000 })).decodedResult;
    
    let query = await aeSdk.getQueryObject(oracle_id, loan_application.oquery)
    let aeusd_total = await query.pollForResponse()
    let ausd =  parseInt(aeusd_total*0.7)
    await contract.methods.borrow(loan_application.loan_id, { onAccount: utils.getDefaultAccounts()[3], amount: toAettos(1000) })
    let balance = (await contract_aex9.methods.balance(wallet_address)).decodedResult;
    assert.equal(balance, ausd)

    let lqueryid = (await contract.methods.raise_liqudation( loan_application.loan_id, { onAccount: utils.getDefaultAccounts()[2], amount: 200000000000000 })).decodedResult;
    let lquery = await aeSdk.getQueryObject(oracle_id, lqueryid)
    let aeusd_total_lquery = await lquery.pollForResponse()
    console.log(aeusd_total_lquery)
    let is_sucees = (await contract.methods.resolve_liquidation( loan_application.loan_id, { onAccount: utils.getDefaultAccounts()[2] })).decodedResult;
    assert.isTrue(is_sucees)
  })
});
