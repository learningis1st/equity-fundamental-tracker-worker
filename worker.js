import { fetchTickersData } from './fetch.js';

const UPSERT_FUNDAMENTAL_QUERY = `
INSERT INTO equity_fundamentals (
    symbol, avg10DaysVolume, avg1YearVolume, declarationDate, divAmount, 
    divExDate, divFreq, divPayAmount, divPayDate, divYield, 
    eps, fundLeverageFactor, lastEarningsDate, nextDivExDate, 
    nextDivPayDate, peRatio, sharesOutstanding, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(symbol) DO UPDATE SET
        avg10DaysVolume = excluded.avg10DaysVolume,
        avg1YearVolume = excluded.avg1YearVolume,
        declarationDate = excluded.declarationDate,
        divAmount = excluded.divAmount,
        divExDate = excluded.divExDate,
        divFreq = excluded.divFreq,
        divPayAmount = excluded.divPayAmount,
        divPayDate = excluded.divPayDate,
        divYield = excluded.divYield,
        eps = excluded.eps,
        fundLeverageFactor = excluded.fundLeverageFactor,
        lastEarningsDate = excluded.lastEarningsDate,
        nextDivExDate = excluded.nextDivExDate,
        nextDivPayDate = excluded.nextDivPayDate,
        peRatio = excluded.peRatio,
        sharesOutstanding = excluded.sharesOutstanding,
        updated_at = CURRENT_TIMESTAMP;
`;

function formatDate(dateString) {
    return dateString ? dateString.split('T')[0] : null;
}

function buildUpsertStatement(symbol, tickerData, database) {
    const values = [
        symbol,
        tickerData.avg10DaysVolume ?? null,
        tickerData.avg1YearVolume ?? null,
        formatDate(tickerData.declarationDate),
        tickerData.divAmount ?? null,
        formatDate(tickerData.divExDate),
        tickerData.divFreq ?? null,
        tickerData.divPayAmount ?? null,
        formatDate(tickerData.divPayDate),
        tickerData.divYield ?? null,
        tickerData.eps ?? null,
        tickerData.fundLeverageFactor ?? null,
        formatDate(tickerData.lastEarningsDate),
        formatDate(tickerData.nextDivExDate),
        formatDate(tickerData.nextDivPayDate),
        tickerData.peRatio ?? null,
        tickerData.sharesOutstanding ?? null
    ];
    return database.prepare(UPSERT_FUNDAMENTAL_QUERY).bind(...values);
}

async function updateAllTickers(env) {
    const database = env.DB;
    console.log('Starting fundamental update for all user tickers');

    try {
        const query = "SELECT layout FROM user_layouts WHERE layout IS NOT NULL";
        const { results } = await database.prepare(query).all();

        const uniqueSymbols = new Set();
        for (const row of results) {
            try {
                const layout = JSON.parse(row.layout);
                for (const widget of layout) {
                    if (widget.symbol) uniqueSymbols.add(widget.symbol.toUpperCase());
                }
            } catch (e) {
                console.error('Error parsing layout JSON:', e);
            }
        }

        const symbolsToFetch = Array.from(uniqueSymbols);
        console.log(`Found ${symbolsToFetch.length} unique symbols:`, symbolsToFetch);

        if (symbolsToFetch.length === 0) return;

        const chunkSize = 50;
        for (let i = 0; i < symbolsToFetch.length; i += chunkSize) {
            const chunk = symbolsToFetch.slice(i, i + chunkSize);
            const tickersData = await fetchTickersData(chunk, env);

            const statements = [];
            for (const [symbol, tickerData] of Object.entries(tickersData)) {
                statements.push(buildUpsertStatement(symbol, tickerData, database));
            }

            if (statements.length > 0) {
                await database.batch(statements);
                console.log(`Successfully batch updated ${statements.length} fundamentals.`);
            }
        }

        console.log('Fundamental update completed!');
    } catch (error) {
        console.error('Error during update:', error);
    }
}

export default {
    async fetch(request, env) {
        return new Response('OK', { status: 200 });
    },

    async scheduled(event, env, ctx) {
        console.log("Cron job triggered");
        ctx.waitUntil(
            updateAllTickers(env).catch(error => {
                console.error('Unhandled error in cron task:', error);
            })
        );
    },
};
