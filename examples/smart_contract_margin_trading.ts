// libraries
import * as qs from 'qs';
import * as fetch from 'node-fetch';
import { Web3Wrapper } from '@0x/web3-wrapper';

// utils
import { setUpWeb3GanacheAsync, baseUnitAmount, fetchERC20BalanceFactory } from './utils';
import { migrationAsync } from '../migrations/migration';

// wrappers
import { SimpleMarginTradingContract } from '../generated-wrappers/simple_margin_trading';

// constants
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const MNEMONIC = process.env.MNEMONIC;
const WETH_CONTRACT = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // DAI mainnet contract address
const CDAI_CONTRACT = '';

const open = async (web3Wrapper: Web3Wrapper, contract: SimpleMarginTradingContract) => {

    const positionSize = baseUnitAmount(0.1);
    const leverage = 0.5; // 1.5x leverage 
    const sellAmount = positionSize.multipliedBy(leverage);

    const params = {
        sellToken: 'ETH',
        buyToken: 'DAI',
        sellAmount: sellAmount.toString(),
    }

    const res = await fetch(`https://api.0x.org/swap/v0/quote?${qs.stringify(params)}`);
    const quote = await res.json();

    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const takerAddress = userAddresses[0];

    try {
        const onchainPassableQuote = {
            buyToken: quote.buyToken,
            sellToken: quote.sellToken,
            buyAmount: quote.buyAmount,
            sellAmount: quote.sellAmount,
            protocolFeeAmount: quote.protocolFeeAmount,
            calldataHex: quote.data,
        };

        const out = await contract.open(onchainPassableQuote).callAsync({
            from: takerAddress,
            value: positionSize,
            gasPrice: quote.gasPrice,
            gas: 300000,
        });
        
        console.log(out);

        const txHash = await contract.open(onchainPassableQuote).sendTransactionAsync({
            from: takerAddress,
            value: positionSize,
            gasPrice: quote.gasPrice,
            gas: 300000,
        });
        console.log(txHash);
    } catch (e) {
        console.log(e)
    }
};

((async ()=>{
    const { web3Wrapper, provider } = await setUpWeb3GanacheAsync(MNEMONIC, ETHEREUM_RPC_URL);
    const { simpleMarginTradingAddress } = await migrationAsync(provider, web3Wrapper);

    const contract = new SimpleMarginTradingContract(simpleMarginTradingAddress, provider);
    
    await open(web3Wrapper, contract);
})())