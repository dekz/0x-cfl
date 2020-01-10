import * as SimpleTokenSwapContractContractArtifact from '../generated-artifacts/SimpleTokenSwapContract.json';
import { SimpleTokenSwapContractContract } from '../generated-wrappers/simple_token_swap_contract';

import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { devConstants } from '@0x/dev-utils';

import { setUpWeb3 } from '../web3/utils';

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const MNEMONIC = process.env.MNEMONIC;
const CHAIN_ID = 1 // Mainnet;

const migrate = async () => {
    const { provider, web3Wrapper } = await setUpWeb3(MNEMONIC, ETHEREUM_RPC_URL);
    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const txDefaults = {
        from: userAddresses[0],
    };
    
    const addresses = getContractAddressesForChainOrThrow(CHAIN_ID);
    const contract = await SimpleTokenSwapContractContract.deployAsync(
        SimpleTokenSwapContractContractArtifact.compilerOutput.evm.bytecode.object,
        SimpleTokenSwapContractContractArtifact.compilerOutput.abi,
        provider,
        txDefaults,
        {},
        addresses.forwarder,
    );

    console.log('deployed at', contract.address);
}

migrate();