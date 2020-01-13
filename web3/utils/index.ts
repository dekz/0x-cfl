import { MnemonicWalletSubprovider, GanacheSubprovider, Web3ProviderEngine, RPCSubprovider } from '@0x/subproviders';
import { BigNumber, providerUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as qs from 'qs';

export const setUpWeb3 = async (mnemonic, rpcUrl) => {
    const providerEngine = new Web3ProviderEngine();
    // Intercept calls to `eth_accounts` and always return empty
    providerEngine.addProvider(new MnemonicWalletSubprovider({
        mnemonic: mnemonic,
    }));
    providerEngine.addProvider(new RPCSubprovider(rpcUrl));
    // Start the Provider Engine
    providerUtils.startProviderEngine(providerEngine);
    const web3Wrapper = new Web3Wrapper(providerEngine);
    return {
        provider: providerEngine,
        web3Wrapper,
    }
}

export const setUpWeb3GanacheAsync = async (mnemonic, rpcUrl) => {
    console.log('forking mainnet in ganache...')
    const ganacheSubprovider = new GanacheSubprovider({
        fork: rpcUrl,
        gasLimit: 100_000_000,
        blockTime: 0,
        // fork_block_number: forkBlockNumber,
        vmErrorsOnRPCResponse: false,
        // logger: { log: console.log },
    } as any);
    const providerEngine = new Web3ProviderEngine();
    providerEngine.addProvider(ganacheSubprovider)
    providerEngine.addProvider(new MnemonicWalletSubprovider({
        mnemonic: mnemonic,
    }));
    providerUtils.startProviderEngine(providerEngine);
    const web3Wrapper = new Web3Wrapper(providerEngine);
    return {
        provider: providerEngine,
        web3Wrapper,
    }
}