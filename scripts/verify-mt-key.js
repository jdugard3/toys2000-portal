import { createHash } from 'crypto';
import { getMarketTimeConfig } from '../lib/markettime-config.js';

const BASE_URL = 'https://publicapi.markettime.com/mtpublic/api/v1';

function keyFingerprint(apiKey) {
  return createHash('sha256').update(apiKey).digest('hex').slice(0, 12);
}

async function main() {
  let config;
  try {
    config = getMarketTimeConfig();
  } catch (err) {
    console.error('Config error:', err.message);
    process.exit(1);
  }

  const fingerprint = keyFingerprint(config.apiKey);
  console.log(`Rep group: ${config.repGroupId}`);
  console.log(`Key fingerprint: ${fingerprint} (if this changes, your .env was edited)`);
  console.log(`Key length: ${config.apiKey.length} chars`);

  const url = `${BASE_URL}/${config.repGroupId}/manufacturers?offset=0&recordSize=1`;
  const res = await fetch(url, {
    headers: { 'x-api-key': config.apiKey, 'Content-Type': 'application/json' },
  });

  const body = await res.text();

  if (res.ok) {
    console.log('MarketTime API key is valid.');
    process.exit(0);
  }

  console.error(`MarketTime API rejected the key (HTTP ${res.status}).`);

  if (res.status === 429) {
    console.error('');
    console.error('This is rate limiting (too many requests), NOT an expired key.');
    console.error('Wait a few minutes and retry. Do not regenerate the API key.');
  } else if (res.status === 401) {
    console.error('');
    console.error('401 = authentication failed. MarketTime does not document daily key expiry or');
    console.error('usage caps that revoke keys. Common causes:');
    console.error('  • Someone regenerated the key in MarketTime (invalidates the old one instantly)');
    console.error('  • .env on this machine differs from where the key was last updated');
    console.error('  • Vercel/production env has a different MT_API_KEY than local .env');
    console.error('');
    console.error('Before regenerating: note the fingerprint above. If it is UNCHANGED from');
    console.error('yesterday but you still get 401, contact MarketTime support — the key was');
    console.error('revoked server-side, not by this app.');
    console.error('');
    console.error('To fix locally: Billing & Payment → API Key → Generate Key → update .env → restart dev.');
  } else {
    console.error('');
    console.error('Response:', body.slice(0, 400));
  }

  if (body) {
    console.error('');
    console.error('MarketTime says:', body.slice(0, 400));
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
