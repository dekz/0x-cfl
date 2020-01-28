// libraries
import * as qs from 'qs';
import * as fetch from 'node-fetch';

// utils
import { baseUnitAmount, setUpWeb3GanacheAsync, fetchERC20BalanceFactory } from './utils';
import { migrationAsync } from '../migrations/migration';

// wrappers
// TODO: wrapper imports goes here

// constants
const SWAP_URL = 'https://api.0x.org/swap/v0';
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const MNEMONIC = process.env.MNEMONIC;
const DAI_CONTRACT = '0x6b175474e89094c44da98b954eedeac495271d0f'; // DAI mainnet contract address

(async () => {
    // initialize ganache fork and deploy contracts
    const { web3Wrapper, provider } = await setUpWeb3GanacheAsync(MNEMONIC, ETHEREUM_RPC_URL);
    const { simpleTokenSwapAddress } = await migrationAsync(provider, web3Wrapper);
    
    // handy util to check address balance of DAI
    const fetchDAIBalanceAsync = fetchERC20BalanceFactory(provider, DAI_CONTRACT);

    // 1. call 0x api for a quote for one dollar of DAI.

    // TODO: write fetch GET call to get a swap quote from 0x API

    // 2. send response from 0x api to your smart contract

    // TODO: write web3 smart contract interaction

})()
