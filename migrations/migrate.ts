import { migrationAsync } from './migration';
import { setUpWeb3GanacheAsync } from '../examples/utils';

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const MNEMONIC = process.env.MNEMONIC;

const migrateAsync = async () => {
    const { web3Wrapper, provider } = await setUpWeb3GanacheAsync(MNEMONIC, ETHEREUM_RPC_URL);
    await migrationAsync(provider, web3Wrapper);
}

migrateAsync();