// libraries
import * as qs from 'qs';
import * as fetch from 'node-fetch';
import { Web3Wrapper } from '@0x/web3-wrapper';

// utils
import { setUpWeb3GanacheAsync, baseUnitAmount } from './utils';
import { migrationAsync } from '../migrations/migration';

// wrappers
import { SimpleMarginTradingContract } from '../generated-wrappers/simple_margin_trading';

// constants
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const MNEMONIC = process.env.MNEMONIC;
const WETH_CONTRACT = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // DAI mainnet contract address
const DAI_CONTRACT = '0x6b175474e89094c44da98b954eedeac495271d0f';

const open = async (web3Wrapper: Web3Wrapper, contract: SimpleMarginTradingContract) => {
    // constants
    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const takerAddress = userAddresses[0];

    // calculations for margin trading
    const positionSize = baseUnitAmount(0.1);
    const leverage = 0.5; // 1.5x leverage 
    const buyAmount = positionSize.multipliedBy(leverage);

    const params = {
        buyToken: 'ETH',
        sellToken: 'DAI',
        buyAmount: buyAmount.toString(),
    }

    const res = await fetch(`https://api.0x.org/swap/v0/quote?${qs.stringify(params)}`);
    const quote = await res.json();

    const onchainPassableQuote = {
        buyToken: WETH_CONTRACT,
        sellToken: DAI_CONTRACT,
        buyAmount: quote.buyAmount,
        sellAmount: quote.sellAmount,
        protocolFee: quote.protocolFee,
        calldataHex: quote.data,
    };
    const value = positionSize.plus(quote.protocolFee);

    try {
        const results = await contract.open(onchainPassableQuote).callAsync({
            from: takerAddress,
            value,
            gasPrice: quote.gasPrice,
            gas: 3000000,
        });

        console.log(`position size: (ETH in Compound + WETH): ${results[0]}`);
        console.log(`dai borrowed from Compound: ${results[1]}`);
        
        await contract.open(onchainPassableQuote).sendTransactionAsync({
            from: takerAddress,
            value,
            gasPrice: quote.gasPrice,
            gas: 3000000,
        });
        console.log("opened position.");
    } catch (e) {
        throw e;
    }
};

const close = async (web3Wrapper: Web3Wrapper, contract: SimpleMarginTradingContract) => {
    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const takerAddress = userAddresses[0];

    const daiBorrowBalance = await contract.getBorrowBalance().callAsync({
        from: takerAddress,
    });
    
    const params = {
        buyToken: 'DAI',
        sellToken: 'WETH',
        buyAmount: daiBorrowBalance.toString(),
    }

    const res = await fetch(`https://api.0x.org/swap/v0/quote?${qs.stringify(params)}`);
    const quote = await res.json();

    console.log(quote);

    const onchainPassableQuote = {
        buyToken: WETH_CONTRACT,
        sellToken: DAI_CONTRACT,
        buyAmount: quote.buyAmount,
        sellAmount: quote.sellAmount,
        protocolFee: quote.protocolFee,
        calldataHex: quote.data,
    };

    const value = quote.protocolFee;

    try {
        const results = await contract.close(onchainPassableQuote).callAsync({
            from: takerAddress,
            value,
            gasPrice: quote.gasPrice,
            gas: 3000000,
        });

        console.log(`eth balance size after repayment: (ETH in Compound + WETH): ${results[0]}`);
        await contract.open(onchainPassableQuote).sendTransactionAsync({
            from: takerAddress,
            value,
            gasPrice: quote.gasPrice,
            gas: 3000000,
        });
        console.log("closed position.");
    } catch (e) {
        throw e;
    }
};

((async () => {
    const { web3Wrapper, provider } = await setUpWeb3GanacheAsync(MNEMONIC, ETHEREUM_RPC_URL);
    const { simpleMarginTradingAddress } = await migrationAsync(provider, web3Wrapper);

    const contract = new SimpleMarginTradingContract(simpleMarginTradingAddress, provider);
    
    await open(web3Wrapper, contract);

    await close(web3Wrapper, contract);
})())