export async function fetchTickersData(symbols, env) {
    if (!symbols?.length) return {};

    const symbolString = symbols.join(',');
    console.log(`Fetching fundamentals for symbols: ${symbolString}`);

    try {
        const url = new URL('https://finance.learningis1.st/quote');
        url.searchParams.set('symbol', symbolString);
        url.searchParams.set('fields', 'fundamental');

        const response = await env.SCHWAB_WORKER.fetch(url.toString());

        if (!response.ok) {
            console.error(`Fetch failed for ${symbolString}. Status: ${response.status}`);
            return {};
        }

        const data = await response.json();
        const validData = {};

        for (const [symbol, assetData] of Object.entries(data)) {
            if (assetData?.assetMainType === 'EQUITY' && assetData.fundamental) {
                validData[symbol] = assetData.fundamental;
            } else if (assetData) {
                console.log(`Skipping fundamentals for ${symbol}: Not an EQUITY or missing fundamental data.`);
            } else {
                console.error(`No data returned for ${symbol}`);
            }
        }

        return validData;

    } catch (error) {
        console.error(`Error fetching data for symbols:`, error);
        return {};
    }
}
