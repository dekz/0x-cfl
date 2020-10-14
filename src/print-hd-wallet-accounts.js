'use strict'
require('colors');
const process = require('process');
const bip39 = require('ethereum-cryptography/bip39');
const EthereumHDKey = require('ethereumjs-wallet/hdkey');

const { MNEMONIC } = process.env;
const DERIVATION_PATH = `m/44'/60'/0'/0`;

(() => {
    if (!MNEMONIC) {
        throw new Error('No mnemonic configured');
    }
    const wallet = EthereumHDKey.fromMasterSeed(
        bip39.mnemonicToSeedSync(MNEMONIC),
    );
    const addresses = [];
    for (let i = 0; i < 10; ++i) {
        addresses.push(`0x` +
            wallet
                .derivePath(`${DERIVATION_PATH}/${i}`)
                .getWallet()
                .getAddress()
                .toString('hex')
        );
    }
    console.info(addresses.map(a => `◦ ${a.bold.yellow}`).join('\n'));
})();
