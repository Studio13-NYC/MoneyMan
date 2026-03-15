/**
 * Create a new OpenAI organization admin API key.
 * Uses OPENAI_ADMIN_KEY (or OPENAI_API_KEY) from .env. Only org owners can create admin keys.
 *
 * Usage: node scripts/create-openai-admin-key.js [key-name]
 * Example: node scripts/create-openai-admin-key.js "MoneyMan"
 *
 * The new key is printed once; copy it and add to .env as OPENAI_API_KEY (or store securely).
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const adminKey = process.env.OPENAI_ADMIN_KEY || process.env.OPENAI_API_KEY;
const name = process.argv.slice(2).join(' ').trim() || 'MoneyMan';

async function createAdminKey() {
  const res = await fetch('https://api.openai.com/v1/organization/admin_api_keys', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error?.message || data.error || JSON.stringify(data);
    console.error('OpenAI error:', res.status, msg);
    if (String(msg).includes('internal service URL')) {
      console.error('\nAdmin key creation via API is not available for this account.');
      console.error('Create an admin key in the dashboard instead:');
      console.error('  https://platform.openai.com/settings/organization/admin-keys');
    }
    process.exitCode = 1;
    return;
  }

  const value = data.value;
  if (!value) {
    console.error('Response did not include key value:', data);
    process.exitCode = 1;
    return;
  }

  console.log('New admin API key created. Copy it now (it is only shown once):\n');
  console.log(value);
  console.log('\nAdd to .env as OPENAI_API_KEY=... or store securely.');
}

if (!adminKey || !adminKey.trim()) {
  console.error('Missing OPENAI_ADMIN_KEY or OPENAI_API_KEY in .env');
  process.exitCode = 1;
} else {
  createAdminKey().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
