// libraries
import * as qs from 'qs';
import * as fetch from 'node-fetch';

// utils
import { setUpWeb3GanacheAsync, baseUnitAmount, fetchERC20BalanceFactory } from './utils';

// wrappers
import { SimpleTokenSwapContractContract } from '../generated-wrappers/simple_token_swap_contract';

// constants
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const MNEMONIC = process.env.MNEMONIC;
const DAI_CONTRACT = '0x6b175474e89094c44da98b954eedeac495271d0f'; // DAI mainnet contract address
