import * as SimpleTokenSwapArtifact from '../generated-artifacts/SimpleTokenSwap.json';
import { SimpleTokenSwapContract } from '../generated-wrappers/simple_token_swap';

import * as SimpleMarginTradingArtifact from '../generated-artifacts/SimpleMarginTrading.json';
import { SimpleMarginTradingContract } from '../generated-wrappers/simple_margin_trading';

import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';

const COMPOUND_FINANCE_ADDRESSES = {
    comptroller: '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b',
    ceth: '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5',
    cdai: '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
}

const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f'; // DAI mainnet contract address

const CHAIN_ID = 1 // Mainnet;

export const migrationAsync = async (provider, web3Wrapper) => {
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

    console.log(zeroExaddresses.exchange);
    console.log(COMPOUND_FINANCE_ADDRESSES.comptroller);
    console.log(COMPOUND_FINANCE_ADDRESSES.cdai);
    console.log(DAI_ADDRESS);
    console.log(COMPOUND_FINANCE_ADDRESSES.ceth);
    console.log(zeroExaddresses.etherToken);
    
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
        simpleTokenSwapAddress: simpleTokenSwap.address,
        simpleMarginTradingAddress: simpleMarginTrading.address,
    }
}