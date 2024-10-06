const { ethers } = require('ethers');

(async () => {
    const ora = (await import('ora')).default;

    // RPC WebSocket URL for PulseChain Mainnet
    const wsUrl = 'wss://rpc-pulsechain.g4mm4.io';

    // Create a WebSocketProvider
    const provider = new ethers.WebSocketProvider(wsUrl);

    // Spinner for CLI
    const spinner = ora('Listening for new blocks...').start();

    // Variables to track time and transactions
    let previousBlockTime = null;
    let previousBlockNumber = null;

    // Listen for new blocks
    provider.on('block', async (blockNumber) => {
        try {
            // Fetch block details, including transactions
            const block = await provider.getBlock(blockNumber, true);  // true to include transactions

            const currentBlockTime = block.timestamp;
            const currentBlockTransactions = block.transactions.length;

            // If this is not the first block, calculate TPS
            if (previousBlockTime && previousBlockNumber) {
                const timeDiff = currentBlockTime - previousBlockTime;
                const tps = currentBlockTransactions / timeDiff;

                spinner.succeed(
                    `Block ${blockNumber} | TPS: ${tps.toFixed(2)} | Transactions: ${currentBlockTransactions}`
                );
                spinner.start('Listening for new blocks...');
            }

            // Update previous block data
            previousBlockTime = currentBlockTime;
            previousBlockNumber = blockNumber;
        } catch (error) {
            spinner.fail(`Error fetching block ${blockNumber}: ${error.message}`);
        }
    });
})();
