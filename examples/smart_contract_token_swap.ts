// libraries
import * as qs from 'qs';
import * as fetch from 'node-fetch';

// utils
import { baseUnitAmount, setUpWeb3GanacheAsync, fetchERC20BalanceFactory } from './utils';
import { simpleTokenSwapMigrationAsync } from '../migrations/migration';

// wrappers
import { SimpleTokenSwapContract } from '../generated-wrappers/simple_token_swap';

// constants
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const MNEMONIC = process.env.MNEMONIC;
const DAI_CONTRACT = '0x6b175474e89094c44da98b954eedeac495271d0f'; // DAI mainnet contract address

(async () => {
    // initialize ganache fork and deploy contracts
    const { web3Wrapper, provider } = await setUpWeb3GanacheAsync(MNEMONIC, ETHEREUM_RPC_URL);
    const { simpleTokenSwapAddress } = await simpleTokenSwapMigrationAsync(provider, web3Wrapper);

    // handy util to check address balance of DAI
    const fetchDAIBalanceAsync = fetchERC20BalanceFactory(provider, DAI_CONTRACT);

    // 1. call 0x api for a quote for one dollar of DAI.
    const buyAmount = baseUnitAmount(1);

    const params = {
        sellToken: 'ETH',
        buyToken: 'DAI',
        buyAmount: buyAmount.toString(),
    }

    const res = await fetch(`https://api.0x.org/swap/v0/quote?${qs.stringify(params)}`);
    const quote = await res.json();

    // 2. send response from 0x api to your smart contract
    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const takerAddress = userAddresses[0];

    const contract = new SimpleTokenSwapContract(simpleTokenSwapAddress, provider);
    try {
        console.log(`contract dai balance before: ${await fetchDAIBalanceAsync(contract.address)}`);        
        await contract.liquidityRequiringFunction(quote.data).sendTransactionAsync({
            from: takerAddress,
            value: quote.value,
            gasPrice: quote.gasPrice,
            gas: 300000,
        });
        console.log(`contract dai balance after: ${await fetchDAIBalanceAsync(contract.address)}`);
    } catch (e) {
        console.log(e)
    }
})()