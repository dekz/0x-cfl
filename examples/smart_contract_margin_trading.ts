// libraries
import * as qs from 'qs';
import * as fetch from 'node-fetch';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Web3ProviderEngine } from '@0x/subproviders';

// utils
import { setUpWeb3, setUpWeb3GanacheAsync, baseUnitAmount, fetchERC20BalanceFactory } from './utils';
import { migrationAsync } from '../migrations/migration';

// wrappers
import { SimpleMarginTradingContract } from '../generated-wrappers/simple_margin_trading';

// constants
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const MNEMONIC = process.env.MNEMONIC;
const WETH_CONTRACT = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // DAI mainnet contract address
const DAI_CONTRACT = '0x6b175474e89094c44da98b954eedeac495271d0f';
const CETH_CONTRACT = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';

const open = async (web3Wrapper: Web3Wrapper, provider: Web3ProviderEngine, contract: SimpleMarginTradingContract) => {

    const positionSize = baseUnitAmount(0.1);
    const leverage = 0.5; // 1.5x leverage 
    const buyAmount = positionSize.multipliedBy(leverage);

    const params = {
        buyToken: 'ETH',
        sellToken: 'DAI',
        buyAmount: buyAmount.toString(),
    }

    const fetchDAIBalanceAsync = fetchERC20BalanceFactory(provider, DAI_CONTRACT);
    const fetchCETHBalanceAsync = fetchERC20BalanceFactory(provider, CETH_CONTRACT);

    const res = await fetch(`https://api.0x.org/swap/v0/quote?${qs.stringify(params)}`);
    const quote = await res.json();

    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const takerAddress = userAddresses[0];

    try {
        const onchainPassableQuote = {
            buyToken: WETH_CONTRACT,
            sellToken: DAI_CONTRACT,
            buyAmount: quote.buyAmount,
            sellAmount: quote.sellAmount,
            protocolFee: quote.protocolFee,
            calldataHex: quote.data,
        };
        const value = positionSize.plus(quote.protocolFee);
        const out = await contract.open(onchainPassableQuote).callAsync({
            from: takerAddress,
            value,
            gasPrice: quote.gasPrice,
            gas: 300000,
        });
        console.log(out);
        // console.log('fetchDAIBalanceAsync', await fetchDAIBalanceAsync(contract.address));
        // console.log('fetchCETHBalanceAsync', await fetchCETHBalanceAsync(contract.address));
        // const txHash = await contract.open(onchainPassableQuote).sendTransactionAsync({
        //     from: takerAddress,
        //     value,
        //     gasPrice: quote.gasPrice,
        //     gas: 300000,
        // });
        // console.log(txHash);
        // console.log('fetchDAIBalanceAsync', await fetchDAIBalanceAsync(contract.address));
        // console.log('fetchCETHBalanceAsync', await fetchCETHBalanceAsync(contract.address));
    } catch (e) {
        console.log(e)
    }
};

((async ()=>{
    const { web3Wrapper, provider } = await setUpWeb3GanacheAsync(MNEMONIC, ETHEREUM_RPC_URL);
    const { simpleMarginTradingAddress } = await migrationAsync(provider, web3Wrapper);

    const contract = new SimpleMarginTradingContract(simpleMarginTradingAddress, provider);
    
    await open(web3Wrapper, provider, contract);
})())