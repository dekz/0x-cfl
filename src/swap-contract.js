'use strict'
require('colors');
const fetch = require('node-fetch');
const process = require('process');
const { createWeb3, createQueryString, etherToWei, waitForTxSuccess, weiToEther } = require('./utils');

const API_QUOTE_URL = 'https://api.0x.org/swap/v1/quote';
const { abi: ABI } = require('../build/contracts/SimpleTokenSwap.json');

require('yargs')
    .parserConfiguration({ 'parse-numbers': false })
    .command(
        '* <deployedAddress>',
        'fill a swap WETH->DAI quote through a deployed SimpleTokenSwap contract',
        yargs => {
            return yargs
                .option(
                    'sellAmount',
                    {
                        alias: 'a',
                        type: 'number',
                        describe: 'Amount of WETH to sell (in token units)',
                        default: 0.1,
                    },
                )
                .positional(
                    'deployedAddress',
                    {
                        type: 'string',
                        describe: 'Deployed address of the SimpleTokenSwap contract',
                    },
                );
        },
        async argv => {
            try {
                await run(argv);
                process.exit(0);
            } catch (err) {
                console.error(err);
                process.exit(1);
            }
        },
    )
    .argv;

async function run(argv) {
    const web3 = createWeb3();
    const contract = new web3.eth.Contract(ABI, argv.deployedAddress);
    const [owner] = await web3.eth.getAccounts();

    // Convert sellAmount from token units to wei.
    const sellAmountWei = etherToWei(argv.sellAmount);

    // Deposit some WETH into the contract. This function accepts ETH and
    // wraps it to WETH on the fly.
    console.info(`Depositing ${argv.sellAmount} ETH (WETH) into the contract at ${argv.deployedAddress.bold}...`);
    await waitForTxSuccess(contract.methods.depositETH().send({
        value: sellAmountWei,
        from: owner,
    }));

    // Get a quote from 0x-API to sell the WETH we just deposited into the contract.
    console.info(`Fetching swap quote from 0x-API to sell ${argv.sellAmount} WETH for DAI...`);
    const qs = createQueryString({
        sellToken: 'WETH',
        buyToken: 'DAI',
        sellAmount: sellAmountWei,
    });
    const quoteUrl = `${API_QUOTE_URL}?${qs}`;
    console.info(`Fetching quote ${quoteUrl.bold}...`);
    const response = await fetch(quoteUrl);
    const quote = await response.json();
    console.info(`Received a quote with price ${quote.price}`);

    // Have the contract fill the quote, selling its own WETH.
    console.info(`Filling the quote through the contract at ${argv.deployedAddress.bold}...`);
    const receipt = await waitForTxSuccess(contract.methods.fillQuote(
            quote.sellTokenAddress,
            quote.buyTokenAddress,
            quote.allowanceTarget,
            quote.to,
            quote.data,
        ).send({
            from: owner,
            value: quote.value,
            gasPrice: quote.gasPrice,
        }));
    const boughtAmount = weiToEther(receipt.events.BoughtTokens.returnValues.boughtAmount);
    console.info(`${'✔'.bold.green} Successfully sold ${argv.sellAmount.toString().bold} WETH for ${boughtAmount.bold.green} DAI!`);
    // The contract now has `boughtAmount` of DAI!
}
