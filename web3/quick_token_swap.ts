// import { ContractWrappers } from '@0x/contract-wrappers';
import { MnemonicWalletSubprovider, Web3ProviderEngine, RPCSubprovider } from '@0x/subproviders';
import { ERC20TokenContract } from '@0x/contracts-erc20'
import { BigNumber, providerUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as qs from 'qs';

import { SimpleTokenSwapContractContract } from '../generated-wrappers/simple_token_swap_contract';

import { setUpWeb3, setUpWeb3Ganache } from './utils';

const fetch = require('node-fetch');

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const MNEMONIC = process.env.MNEMONIC;

const ADDRESS = '0xa11cb81824ded10e2f96958b6329a4cd871b9378';

const baseUnitAmount = (unitAmount: number, decimals = 18): BigNumber => {
    return Web3Wrapper.toBaseUnitAmount(new BigNumber(unitAmount), decimals);
};
 
(async () => {
    const { web3Wrapper, provider } = await setUpWeb3Ganache(MNEMONIC, ETHEREUM_RPC_URL);

    // 1. call 0x api for a quote for one dollar of DAI.
    const buyAmount = baseUnitAmount(1);

    const params = {
        sellToken: 'ETH',
        buyToken: 'DAI',
        buyAmount: buyAmount.toString(),
    }
    const res = await fetch(`https://api.0x.org/swap/quote?${qs.stringify(params)}`);
    const quote = await res.json();

    const daiContract = new ERC20TokenContract('0x6b175474e89094c44da98b954eedeac495271d0f', provider);

    // 2. send response from 0x api to your smart contract
    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const from = userAddresses[0];

    const contract = new SimpleTokenSwapContractContract(ADDRESS, provider);
    try {
        console.log(`contract dai balance before: ${await daiContract.balanceOf(ADDRESS).callAsync()}`);
        const txHash = await contract.liquidityRequiringFunction(quote.data).sendTransactionAsync({
            from,
            value: quote.value,
            gasPrice: quote.gasPrice,
            gas: 305287,
        });
        console.log(txHash);
        console.log(`contract dai balance before: ${await daiContract.balanceOf(ADDRESS).callAsync()}`);
    } catch (e) {
        console.log(e)
    }
})()