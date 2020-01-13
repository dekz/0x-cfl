import * as SimpleTokenSwapContractArtifact from '../generated-artifacts/SimpleTokenSwapContract.json';
import { SimpleTokenSwapContractContract } from '../generated-wrappers/simple_token_swap_contract';

import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';


const CHAIN_ID = 1 // Mainnet;

export const migrationAsync = async (provider, web3Wrapper) => {
    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const txDefaults = {
        from: userAddresses[0],
    };
    
    const addresses = getContractAddressesForChainOrThrow(CHAIN_ID);
    const contract = await SimpleTokenSwapContractContract.deployAsync(
        SimpleTokenSwapContractArtifact.compilerOutput.evm.bytecode.object,
        SimpleTokenSwapContractArtifact.compilerOutput.abi,
        provider,
        txDefaults,
        {},
        addresses.forwarder,
    );

    console.log('SimpleTokenSwapContract deployed at', contract.address);
    
    return {
        simpleTokenSwapAddress: contract.address,
    }
}