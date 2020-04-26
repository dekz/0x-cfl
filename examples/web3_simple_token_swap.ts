// libraries
import * as qs from 'qs';
import * as fetch from 'node-fetch';

// utils
import { setUpWeb3, baseUnitAmount, fetchERC20BalanceFactory } from './utils';
import { ASSET_ADDRESSES } from './utils/addresses';

// constants
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const MNEMONIC = process.env.MNEMONIC;

(async () => {
    // initialize ganache fork
    const { web3Wrapper, provider } = await setUpWeb3(MNEMONIC, ETHEREUM_RPC_URL);

    // get user address
    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const takerAddress = userAddresses[0]

    // 1. call 0x api for a quote for one dollar of DAI.
    const buyAmount = baseUnitAmount(1);

    let params = {
        sellToken: 'ETH',
        buyToken: 'DAI',
        buyAmount: buyAmount.toString(),
        takerAddress,
    }
    
    const fetchDAIBalanceAsync = fetchERC20BalanceFactory(provider, ASSET_ADDRESSES.dai);

    const res = await fetch(`https://kovan.api.0x.org/swap/v0/quote?${qs.stringify(params)}`);
    const quote = await res.json();

    console.log("quote", quote);

    // 2. send transaction with response from 0x api
    try {
        console.log(`takerAddress dai balance before: ${await fetchDAIBalanceAsync(takerAddress)}`);
        const txHash = await web3Wrapper.sendTransactionAsync({
            ...quote,
            ...{
                from: takerAddress,
            },
        });
        await web3Wrapper.awaitTransactionSuccessAsync(txHash);
        console.log(`takerAddress dai balance after: ${await fetchDAIBalanceAsync(takerAddress)}`);
    } catch (e) {
        console.log(e)
    }
})();