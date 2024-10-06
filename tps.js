const { ethers } = require('ethers');
const Table = require('cli-table3');

(async () => {
    const ora = (await import('ora')).default;

    // RPC WebSocket URL for PulseChain Mainnet
    const wsUrl = 'wss://rpc-pulsechain.g4mm4.io';

    // Create a WebSocketProvider
    const provider = new ethers.WebSocketProvider(wsUrl);

    // Spinner for CLI
    const spinner = ora('Listening for new blocks...').start();

    // Storage for tracking block data
    let blockData = [];
    let maxTps24hr = 0;

    // Listen for new blocks
    provider.on('block', async (blockNumber) => {
        try {
            // Fetch block details with transactions
            const block = await provider.getBlock(blockNumber, true);  // true to include transactions

            const currentBlockTime = block.timestamp;
            const currentBlockTransactions = block.transactions.length;

            // Calculate TPS for the current block
            const lastBlock = blockData.length > 0 ? blockData[blockData.length - 1] : null;
            let currentTps = 0;

            if (lastBlock) {
                const timeDiff = currentBlockTime - lastBlock.time;
                currentTps = currentBlockTransactions / timeDiff;
            }

            // Add the current block's data to the array
            blockData.push({
                number: blockNumber,
                txs: currentBlockTransactions,
                tps: currentTps,
                time: currentBlockTime
            });

            // Remove blocks older than 24 hours from tracking
            const oneDayAgo = currentBlockTime - 24 * 60 * 60;  // 24 hours ago
            blockData = blockData.filter(b => b.time > oneDayAgo);

            // Update the max TPS for the last 24 hours
            maxTps24hr = Math.max(maxTps24hr, currentTps);

            // Calculate 5-minute and 1-hour average TPS
            const fiveMinutesAgo = currentBlockTime - 5 * 60;  // 5 minutes ago
            const oneHourAgo = currentBlockTime - 60 * 60;     // 1 hour ago

            const avgTps5min = calculateAvgTps(fiveMinutesAgo);
            const avgTps1hr = calculateAvgTps(oneHourAgo);

            // Display data in table format
            displayTable(blockNumber, currentBlockTransactions, currentTps, avgTps5min, avgTps1hr, maxTps24hr);

        } catch (error) {
            spinner.fail(`Error fetching block ${blockNumber}: ${error.message}`);
        }
    });

    // Function to calculate average TPS in a time range
    function calculateAvgTps(startTime) {
        const blocksInRange = blockData.filter(b => b.time >= startTime);
        const totalTxs = blocksInRange.reduce((sum, b) => sum + b.txs, 0);
        const totalTime = blocksInRange.reduce((sum, b, i, arr) => {
            if (i > 0) {
                sum += (b.time - arr[i - 1].time);
            }
            return sum;
        }, 0);

        return totalTime > 0 ? totalTxs / totalTime : 0;
    }

    // Function to display a table with TPS statistics
    function displayTable(currentBlock, txs, currentTps, avgTps5min, avgTps1hr, maxTps24hr) {
        const table = new Table({
            head: ['Metric', 'Value'],
            colWidths: [30, 20]
        });

        table.push(
            ['Current Block', currentBlock],
            ['Transactions in Current Block', txs],
            ['Current TPS', currentTps.toFixed(2)],
            ['5-Minute Avg TPS', avgTps5min.toFixed(2)],
            ['1-Hour Avg TPS', avgTps1hr.toFixed(2)],
            ['24-Hour Max TPS', maxTps24hr.toFixed(2)]
        );

        // Clear the console and render the table
        console.clear();
        console.log(table.toString());
    }
})();
