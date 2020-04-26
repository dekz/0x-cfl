import * as SimpleTokenSwapArtifact from '../generated-artifacts/SimpleTokenSwap.json';
import { SimpleTokenSwapContract } from '../generated-wrappers/simple_token_swap';

import * as SimpleMarginTradingArtifact from '../generated-artifacts/SimpleMarginTrading.json';
import { SimpleMarginTradingContract } from '../generated-wrappers/simple_margin_trading';

import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { ASSET_ADDRESSES, COMPOUND_FINANCE_ADDRESSES } from '../examples/utils/addresses';

const CHAIN_ID = parseInt(process.env.CHAIN_ID) || 1;

export const marginTradingMigrationAsync = async (provider, web3Wrapper) => {
    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const txDefaults = {
        from: userAddresses[0],
    };
    
    const zeroExaddresses = getContractAddressesForChainOrThrow(CHAIN_ID);

    const simpleMarginTrading = await SimpleMarginTradingContract.deployAsync(
        SimpleMarginTradingArtifact.compilerOutput.evm.bytecode.object,
        SimpleMarginTradingArtifact.compilerOutput.abi,
        provider,
        txDefaults,
        {},
        zeroExaddresses.exchange,
        COMPOUND_FINANCE_ADDRESSES.comptroller,
        COMPOUND_FINANCE_ADDRESSES.cdai,
        ASSET_ADDRESSES.dai,
        COMPOUND_FINANCE_ADDRESSES.ceth,
        zeroExaddresses.etherToken,
        );
    
    return {
        simpleMarginTradingAddress: simpleMarginTrading.address,
    }
};

export const simpleTokenSwapMigrationAsync = async (provider, web3Wrapper) => {
    const userAddresses = await web3Wrapper.getAvailableAddressesAsync();
    const txDefaults = {
        from: userAddresses[0],
    };
    
    const zeroExaddresses = getContractAddressesForChainOrThrow(CHAIN_ID);

    const simpleTokenSwap = await SimpleTokenSwapContract.deployAsync(
        SimpleTokenSwapArtifact.compilerOutput.evm.bytecode.object,
        SimpleTokenSwapArtifact.compilerOutput.abi,
        provider,
        txDefaults,
        {},
        zeroExaddresses.forwarder,
    );

    return {
        simpleTokenSwapAddress: simpleTokenSwap.address,
    }
}