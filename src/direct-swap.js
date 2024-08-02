'use strict'
require('colors');
const BigNumber = require('bignumber.js');
const fetch = require('node-fetch');
const process = require('process');
const { createWeb3, createQueryString, etherToWei, waitForTxSuccess, weiToEther } = require('./utils');

const API_QUOTE_URL = 'https://api.0x.org/swap/v1/quote';
const { abi: ERC20_ABI } = require('../build/contracts/IERC20.json');
const { abi: WETH_ABI } = require('../build/contracts/IWETH.json');
const { FORKED } = process.env;

require('yargs')
    .parserConfiguration({ 'parse-numbers': false })
    .command(
        '*',
        'directly fill a WETH->DAI swap quote',
        yargs => {
            return yargs
                .option(
                    'weth',
                    {
                        alias: 'w',
                        type: 'string',
                        describe: 'address of the WETH contract',
                        default: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    },
                )
                .option(
                    'dai',
                    {
                        alias: 'd',
                        type: 'string',
                        describe: 'address of the DAI contract',
                        default: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    },
                )
                .option(
                    'sellAmount',
                    {
                        alias: 'a',
                        type: 'number',
                        describe: 'Amount of WETH to sell (in token units)',
                        default: 0.1,
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
    const [taker] = await web3.eth.getAccounts();
    const weth = new web3.eth.Contract(WETH_ABI, argv.weth);
    const dai = new web3.eth.Contract(ERC20_ABI, argv.dai);

    // Convert sellAmount from token units to wei.
    const sellAmountWei = etherToWei(argv.sellAmount);

    // Mint some WETH using ETH.
    console.info(`Minting ${argv.sellAmount} WETH...`);
    await waitForTxSuccess(weth.methods.deposit().send({
        value: sellAmountWei,
        from: taker,
    }));

    // Track our DAI balance.
    const daiStartingBalance = await dai.methods.balanceOf(taker).call();

    // Get a quote from 0x-API to sell the WETH we just minted.
    console.info(`Fetching swap quote from 0x-API to sell ${argv.sellAmount} WETH for DAI...`);
    const qs = createQueryString({
        sellToken: 'WETH',
        buyToken: 'DAI',
        sellAmount: sellAmountWei,
        // 0x-API cannot perform taker validation in forked mode.
        ...(FORKED ? {} : { takerAddress: taker }),
    });
    const quoteUrl = `${API_QUOTE_URL}?${qs}`;
    console.info(`Fetching quote ${quoteUrl.bold}...`);
    const response = await fetch(quoteUrl);
    const quote = await response.json();
    console.info(`Received a quote with price ${quote.price}`);

    // Grant the allowance target an allowance to spend our WETH.
    await waitForTxSuccess(
        weth.methods.approve(
            quote.allowanceTarget,
            quote.sellAmount,
        )
        .send({ from: taker }),
    );

    // Fill the quote.
    console.info(`Filling the quote directly...`);
    const receipt = await waitForTxSuccess(web3.eth.sendTransaction({
        from: taker,
        to: quote.to,
        data: quote.data,
        value: quote.value,
        gasPrice: quote.gasPrice,
        // 0x-API cannot estimate gas in forked mode.
        ...(FORKED ? {} : { gas : quote.gas }),
    }));

    // Detect balances changes.
    const boughtAmount = weiToEther(
        new BigNumber(await dai.methods.balanceOf(taker).call())
            .minus(daiStartingBalance)
    );
    console.info(`${'✔'.bold.green} Successfully sold ${argv.sellAmount.toString().bold} WETH for ${boughtAmount.bold.green} DAI!`);
    // The taker now has `boughtAmount` of DAI!
}
