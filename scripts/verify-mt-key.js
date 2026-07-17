import { getMarketTimeConfig } from '../lib/markettime-config.js';

const BASE_URL = 'https://publicapi.markettime.com/mtpublic/api/v1';

async function main() {
  let config;
  try {
    config = getMarketTimeConfig();
  } catch (err) {
    console.error('Config error:', err.message);
    process.exit(1);
  }

  const url = `${BASE_URL}/${config.repGroupId}/manufacturers`;
  const res = await fetch(url, {
    headers: { 'x-api-key': config.apiKey, 'Content-Type': 'application/json' },
  });

  const body = await res.text();

  if (res.ok) {
    console.log('MarketTime API key is valid.');
    console.log(`Rep group: ${config.repGroupId}`);
    process.exit(0);
  }

  console.error(`MarketTime API rejected the key (${res.status}).`);
  if (res.status === 401) {
    console.error('');
    console.error('Generate a new API key in MarketTime: Billing & Payment → API Key.');
    console.error('Update MT_API_KEY in .env and .env.local, then restart npm run dev.');
    console.error('Run: npm run verify:mt');
  } else {
    console.error(body.slice(0, 300));
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
