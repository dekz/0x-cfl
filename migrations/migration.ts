import * as SimpleTokenSwapArtifact from '../generated-artifacts/SimpleTokenSwap.json';
import { SimpleTokenSwapContract } from '../generated-wrappers/simple_token_swap';

import * as SimpleMarginTradingArtifact from '../generated-artifacts/SimpleMarginTrading.json';
import { SimpleMarginTradingContract } from '../generated-wrappers/simple_margin_trading';

import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';

const COMPOUND_FINANCE_ADDRESSES = {
    comptroller: '0x1f5d7f3caac149fe41b8bd62a3673fe6ec0ab73b',
    ceth: '0xf92fbe0d3c0dcdae407923b2ac17ec223b1084e4',
    cdai: '0xe7bc397dbd069fc7d0109c0636d06888bb50668c',
}

const DAI_ADDRESS = '0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa'; // DAI mainnet contract address

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
        DAI_ADDRESS,
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