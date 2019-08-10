import { web3Factory } from '@0x/dev-utils';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { utils } from './utils';
import { SwapQuoteConsumer } from '@0x/asset-swapper';

(async () => {
    const provider = web3Factory.getRpcProvider({ shouldUseInProcessGanache: true });
    const web3Wrapper = new Web3Wrapper(provider);

    const { contract, usdc, dai, addresses } = await utils.setupContractsAsync(web3Wrapper);
    // Contract can now fill orders with DAI and has a DAI balance

    // Get an SwapQuoter with orders for usdc/dai
    // Normally this would connect to an SRA endpoint or another order provider
    let swapQuoter, quote, fillResults, txHash;
    swapQuoter = await utils.assetSwapperWithOrdersAsync(
        addresses.exchange,
        web3Wrapper.getProvider(),
        usdc.address,
        dai.address,
    );
    // Get a quote for 500 USDC, liquidityRequiringFunction determines the correct amount to fill
    // at transaction execution time, but has enough orders to fill 500 USDC
    console.log('liquidityRequiringFunction');
    // Create a quote buying 500 USDC using dai
    quote = await swapQuoter.getMarketBuySwapQuoteAsync(usdc.address, dai.address, new BigNumber(500));
    console.log('Quote', quote);
    const consumer = new SwapQuoteConsumer(web3Wrapper.getProvider());

    // Get the orders and the signatures to fulfill the quote
    const contractParams = await consumer.getSmartContractParamsOrThrowAsync(quote, { takerAddress: contract.address });
    const { orders, signatures } = contractParams.params;

    // Perform call to ensure the transaction is successful
    fillResults = await contract.liquidityRequiringFunction.callAsync(orders, signatures);
    console.log('FillResults', fillResults);
    // Fill the orders via the contract
    txHash = await contract.liquidityRequiringFunction.sendTransactionAsync(orders, signatures);
    await web3Wrapper.awaitTransactionSuccessAsync(txHash);

    // Fill the Orders by executing the call generated via asset swapper.
    // This call includes the amount (500) in the call data
    console.log('liquidityRequiringFunctionBytes');
    swapQuoter = await utils.assetSwapperWithOrdersAsync(
        addresses.exchange,
        web3Wrapper.getProvider(),
        usdc.address,
        dai.address,
    );
    // Create a quote buying 500 USDC using dai
    quote = await swapQuoter.getMarketBuySwapQuoteAsync(usdc.address, dai.address, new BigNumber(500));
    // Fill using liquidityRequiringFunctionBytes
    const { calldataHexString } = await consumer.getCalldataOrThrowAsync(quote, { takerAddress: contract.address });
    // Perform call to ensure the transaction is successful
    fillResults = await contract.liquidityRequiringFunctionBytes.callAsync(calldataHexString);
    console.log('FillResults', fillResults);
    // Fill the orders via the contract
    txHash = await contract.liquidityRequiringFunctionBytes.sendTransactionAsync(calldataHexString);
    await web3Wrapper.awaitTransactionSuccessAsync(txHash);
})();
