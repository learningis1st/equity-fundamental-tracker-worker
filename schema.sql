-- Run: wrangler d1 execute dashboard-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS equity_fundamentals (
    symbol TEXT PRIMARY KEY,
    avg10DaysVolume REAL,
    avg1YearVolume REAL,
    declarationDate TEXT,
    divAmount REAL,
    divExDate TEXT,
    divFreq INTEGER,
    divPayAmount REAL,
    divPayDate TEXT,
    divYield REAL,
    eps REAL,
    fundLeverageFactor REAL,
    lastEarningsDate TEXT,
    nextDivExDate TEXT,
    nextDivPayDate TEXT,
    peRatio REAL,
    sharesOutstanding REAL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
