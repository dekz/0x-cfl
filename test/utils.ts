import { DummyERC20TokenContract } from '@0x/contracts-erc20';
import * as DummyERC20Artifact from '@0x/contracts-erc20/generated-artifacts/DummyERC20Token.json';
import { devConstants } from '@0x/dev-utils';
import { runMigrationsOnceAsync, Web3ProviderEngine } from '@0x/migrations';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as LiquidityRequiringContractArtifact from '../generated-artifacts/LiquidityRequiringContract.json';
import { LiquidityRequiringContractContract } from '../generated-wrappers/liquidity_requiring_contract';
import { SwapQuoter } from '@0x/asset-swapper';
import { assetDataUtils, SignedOrder, Order, signatureUtils } from '@0x/order-utils';

export const utils = {
    assetSwapperWithOrdersAsync: async (
        exchangeAddress: string,
        provider: any,
        makerAsset: string,
        takerAsset: string,
    ): Promise<SwapQuoter> => {
        const makerAssetData = assetDataUtils.encodeERC20AssetData(makerAsset);
        const takerAssetData = assetDataUtils.encodeERC20AssetData(takerAsset);
        const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
        const orders: SignedOrder[] = [];
        for (let i = 0; i < 10; i++) {
            const randomExpiration = new BigNumber(Date.now() + Math.floor(Math.random() * 100) + 1000 * 60 * 10)
                .div(1000)
                .integerValue(BigNumber.ROUND_CEIL);
            // Create an order
            const order: Order = {
                exchangeAddress,
                makerAddress: devConstants.TESTRPC_FIRST_ADDRESS,
                takerAddress: NULL_ADDRESS,
                senderAddress: NULL_ADDRESS,
                feeRecipientAddress: NULL_ADDRESS,
                expirationTimeSeconds: randomExpiration,
                salt: randomExpiration,
                makerAssetAmount: new BigNumber(500),
                takerAssetAmount: new BigNumber(10),
                makerAssetData,
                takerAssetData,
                makerFee: new BigNumber(0),
                takerFee: new BigNumber(0),
            };
            const signedOrder = await signatureUtils.ecSignOrderAsync(
                provider,
                order,
                devConstants.TESTRPC_FIRST_ADDRESS,
            );
            orders.push(signedOrder);
        }

        return SwapQuoter.getSwapQuoterForProvidedOrders(provider, orders);
    },
    setupContractsAsync: async (web3Wrapper: Web3Wrapper) => {
        const txDefaults = {
            gas: devConstants.GAS_LIMIT,
            from: devConstants.TESTRPC_FIRST_ADDRESS,
        };
        const provider = web3Wrapper.getProvider();
        const addresses = await runMigrationsOnceAsync(provider as Web3ProviderEngine, txDefaults);
        // Deploy our liquidity consuming contract
        const contract = await LiquidityRequiringContractContract.deployAsync(
            LiquidityRequiringContractArtifact.compilerOutput.evm.bytecode.object,
            LiquidityRequiringContractArtifact.compilerOutput.abi,
            provider,
            txDefaults,
            {},
            addresses.exchange,
            addresses.erc20Proxy,
        );

        const decimals = new BigNumber(18);
        const totalSupply = Web3Wrapper.toBaseUnitAmount(new BigNumber(10000), 18);

        // Deploy a test token
        const dai = await DummyERC20TokenContract.deployAsync(
            DummyERC20Artifact.compilerOutput.evm.bytecode.object,
            DummyERC20Artifact.compilerOutput.abi,
            provider,
            txDefaults,
            {},
            'Dai',
            'DAI',
            decimals,
            totalSupply,
        );
        const usdc = await DummyERC20TokenContract.deployAsync(
            DummyERC20Artifact.compilerOutput.evm.bytecode.object,
            DummyERC20Artifact.compilerOutput.abi,
            provider,
            txDefaults,
            {},
            'USDC',
            'USDC',
            decimals,
            totalSupply,
        );
        // Set allowances for the liquidity requiring contract
        let txHash = await contract.setProxyAllowance.sendTransactionAsync(dai.address, totalSupply);
        await web3Wrapper.awaitTransactionSuccessAsync(txHash);
        txHash = await contract.setProxyAllowance.sendTransactionAsync(usdc.address, totalSupply);
        await web3Wrapper.awaitTransactionSuccessAsync(txHash);

        // Set allowances for the maker
        txHash = await usdc.approve.sendTransactionAsync(addresses.erc20Proxy, totalSupply);
        await web3Wrapper.awaitTransactionSuccessAsync(txHash);

        // Mint some tokens to the liquidity requiring contract so it can fill orders
        txHash = await dai.mint.sendTransactionAsync(totalSupply, txDefaults);
        await web3Wrapper.awaitTransactionSuccessAsync(txHash);
        txHash = await dai.transfer.sendTransactionAsync(contract.address, totalSupply, txDefaults);
        await web3Wrapper.awaitTransactionSuccessAsync(txHash);
        return { dai, usdc, contract, addresses };
    },
};
