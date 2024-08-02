![alt text](/banner.png "Get started with 0x API")

# Get started with 0x API

This is a repo containing toy examples of filling 0x-API quotes either directly with web3 or through a smart contract.

## Installation
Clone this repo then, from inside the project, run:
```bash
yarn -D
# or
npm install --dev
```

This will also compile the contracts in `contracts/` and produce artifacts in `build/`.

## Examples
The following example scripts are included:

| Script | Guide | Description |
|--------|-------|-------------|
| `src/direct-swap.js` |  [Swap tokens with 0x API](https://docs.0x.org/0x-api-swap/guides/swap-tokens-with-0x-api) | Perform a token swap with web3. |
| `src/swap-contract.js` | [Use 0x API liquidity in your smart contracts](https://docs.0x.org/0x-api-swap/guides/use-0x-api-liquidity-in-your-smart-contracts) | Perform a token swap in a smart contract. |

### Running the examples locally (forked mainnet)
The examples can be run locally (without actually mining transactions) through the magic of ganache forking. You will first need to start a forked ganache instance with the following command, replacing `ETHEREUM_RPC_URL` with the HTTP or websocket RPC URL of your mainnet ethereum node (e.g., Infura mainnet):

```bash
RPC_URL=ETHEREUM_RPC_URL npm run start-fork
```

#### Direct swap
To run the direct swap example, in a separate terminal run:
```bash
npm run swap-fork
```

#### Contract swap
To run the contract swap example, in a seperate terminal run:
```bash
npm run deploy-fork # Only need to do this once per ganache instance.
npm run swap-contract-fork
```

### Running the examples on mainnet
You can also run the examples and perform actual swaps that will get mined with a little effort:

1. Modify the `mnemonic` in `package.json` to one only you know. *Do not use the default mnemonic on mainnet!*
2. Fund the first HD wallet account associated with that mnemonic with some ETH. You can run `npm run print-hd-wallet-accounts` to list the addresses associated with the configured mnemonic.

#### Direct swap
To run the direct swap example *live*, run the following:
```bash
# Replace ETHEREUM_RPC_URL with your mainnet node RPC endpoint.
RPC_URL=ETHEREUM_RPC_URL npm run swap-live
# You can also configure how much WETH is sold with the -a option, e.g.
RPC_URL=ETHEREUM_RPC_URL npm run swap-live -a 0.1
```

#### Contract swap
To run the contract swap example *live*, first deploy the contract to mainnet.

```bash
# Replace ETHEREUM_RPC_URL with your mainnet node RPC endpoint.
RPC_URL=ETHEREUM_RPC_URL npm run deploy-live --network main
```

Note the address to which the contract has been deployed. You can now run the script to perform the swap.

```bash
# Replace ETHEREUM_RPC_URL with your mainnet node RPC endpoint
# and CONTRACT_ADDRESS with the deployed address of the contract.
RPC_URL=ETHEREUM_RPC_URL npm run swap-contract-live CONTRACT_ADDRESS
# You can also configure how much WETH is sold with the -a option, e.g.
RPC_URL=ETHEREUM_RPC_URL npm run swap-contract-live -a 0.1 CONTRACT_ADDRESS
```

Keep in mind that tokens will remain in the contract after the swap and can only be retrieved by your first HD wallet account through `withdrawToken()` or `withdrawETH()`.

## Need help?
* Refer to our [0x API specification](https://0x.org/docs/api) for detailed documentation.
* 0x API is open source! Look through the [codebase](https://github.com/0xProject/0x-api) and deploy your own 0x API instance.
* Don’t hesitate to reach out on [Discord](https://discordapp.com/invite/d3FTX3M) for help! The 0x Core team is active on Discord to help teams building with all things 0x.
