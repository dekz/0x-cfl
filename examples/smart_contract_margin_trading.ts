// libraries
import * as qs from 'qs';
import * as fetch from 'node-fetch';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';

// utils
import { setUpWeb3, baseUnitAmount } from './utils';
import { marginTradingMigrationAsync } from '../migrations/migration';
import { ASSET_ADDRESSES } from './utils/addresses';

// wrappers
import { SimpleMarginTradingContract } from '../generated-wrappers/simple_margin_trading';

// constants
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const MNEMONIC = process.env.MNEMONIC;

const openAsync = async (web3Wrapper: Web3Wrapper, contract: SimpleMarginTradingContract) => {
    // user address interacting with margin contract
    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const takerAddress = userAddresses[0];

    // 1. perform some calculations for the contract
    const positionSize = baseUnitAmount(0.001);
    const leverage = 0.5; // 1.5x leverage 
    const buyAmount = positionSize.multipliedBy(leverage);

    console.log(`fetching quote to buy ${buyAmount} ETH`);

    // 2. fetch a quote from 0x API
    const params = {
        buyToken: 'WETH',
        sellToken: 'DAI',
        buyAmount: buyAmount.toString(),
        excludedSources: 'Eth2Dai,Uniswap,Kyber',
    }

    const res = await fetch(`https://kovan.api.0x.org/swap/v0/quote?${qs.stringify(params)}`);
    const quote = await res.json();

    // prepare API response for contract use
    const onchainPassableQuote = {
        buyToken: ASSET_ADDRESSES.weth,
        sellToken: ASSET_ADDRESSES.dai,
        buyAmount: quote.buyAmount,
        sellAmount: quote.sellAmount,
        protocolFee: quote.protocolFee,
        calldataHex: quote.data,
    };
    const value = positionSize.plus(quote.protocolFee);

    // 3. execute a smart contract call to open a margin position
    try {
        const results = await contract.open(onchainPassableQuote).callAsync({
            from: takerAddress,
            value,
            gasPrice: quote.gasPrice,
            gas: 9000000,
        });

        console.log(`position size: (ETH in Compound + WETH): ${results[0]}`);
        console.log(`dai borrowed from Compound: ${results[1]}`);
        
        await contract.open(onchainPassableQuote).awaitTransactionSuccessAsync({
            from: takerAddress,
            value,
            gasPrice: quote.gasPrice,
            gas: 9000000,
        });
        console.log("opened position.");
    } catch (e) {
        throw e;
    }
};

const closeAsync = async (web3Wrapper: Web3Wrapper, contract: SimpleMarginTradingContract) => {
    // user address interacting with margin contract
    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const takerAddress = userAddresses[0];

    // 1. get the amount of DAI to be repayed by contract when closing position
    const daiBorrowBalance = (await contract.getBorrowBalance().callAsync({
        from: takerAddress,
    })).times(1.0000001).integerValue();
    
    console.log(`need to repay DAI balance of ${daiBorrowBalance.toString()}`);

    // 2. fetch 0x API quote to buy DAI for repayment
    const params = {
        buyToken: 'DAI',
        sellToken: 'WETH',
        buyAmount: daiBorrowBalance.toString(),
        excludedSources: 'Eth2Dai,Uniswap,Kyber',
    }

    const res = await fetch(`https://kovan.api.0x.org/swap/v0/quote?${qs.stringify(params)}`);
   
    const quote = await res.json();

    const onchainPassableQuote = {
        buyToken: ASSET_ADDRESSES.dai,
        sellToken: ASSET_ADDRESSES.weth,
        buyAmount: quote.buyAmount,
        sellAmount: quote.sellAmount,
        protocolFee: quote.protocolFee,
        calldataHex: quote.data,
    };

    // 3. calculate and provide an extra buffer of WETH to pay interest accrued.
    const extraWethBuffer = new BigNumber(quote.sellAmount).times(0.01);
    const value = (new BigNumber(quote.protocolFee)).plus(extraWethBuffer).integerValue();

    // 4. execute a smart contract call to open a margin position
    try {
        const results = await contract.close(onchainPassableQuote).callAsync({
            from: takerAddress,
            value,
            gasPrice: quote.gasPrice,
            gas: 9000000,
        });

        console.log(`eth balance size after closing position: ${results}`);

        await contract.close(onchainPassableQuote).awaitTransactionSuccessAsync({
            from: takerAddress,
            value,
            gasPrice: quote.gasPrice,
            gas: 9000000,
        });
        console.log("closed position.");
    } catch (e) {
        throw e;
    }
};

((async () => {
    const { web3Wrapper, provider } = await setUpWeb3(MNEMONIC, ETHEREUM_RPC_URL);
    const { simpleMarginTradingAddress } = await marginTradingMigrationAsync(provider, web3Wrapper);

    const contract = new SimpleMarginTradingContract(simpleMarginTradingAddress, provider);
    
    // open a position
    await openAsync(web3Wrapper, contract);

    // immediately close the position
    await closeAsync(web3Wrapper, contract);
})())