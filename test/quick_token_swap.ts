// import { ContractWrappers } from '@0x/contract-wrappers';
import { MnemonicWalletSubprovider, Web3ProviderEngine, RPCSubprovider } from '@0x/subproviders';
import { BigNumber, providerUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
// tslint:disable-next-line:no-implicit-dependencies

const fetch = require('node-fetch');

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const MNEMONIC = process.env.MNEMONIC;

const setUpWeb3 = async () => {
    const providerEngine = new Web3ProviderEngine();
    // Intercept calls to `eth_accounts` and always return empty
    providerEngine.addProvider(new MnemonicWalletSubprovider({
        mnemonic: MNEMONIC,
    }));
    providerEngine.addProvider(new RPCSubprovider(ETHEREUM_RPC_URL));
    // Start the Provider Engine
    providerUtils.startProviderEngine(providerEngine);
    const web3Wrapper = new Web3Wrapper(providerEngine);
    return {
        provider: providerEngine,
        web3Wrapper,
    }
}

(async () => {
    const { web3Wrapper, provider } = await setUpWeb3(); 
    
})()