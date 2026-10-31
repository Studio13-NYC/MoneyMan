const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadNotifier(create) {
  const sandbox = {
    module: { exports: {} },
    process: { env: { OPENAI_API_KEY: 'test-placeholder' } },
    require: () => class {
      constructor() { this.chat = { completions: { create } }; }
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'llm-notify.js'), 'utf8'), sandbox);
  return sandbox.module.exports.generateNotificationMessage;
}

test('notification uses Terra high and budgets for reasoning', async () => {
  const notify = loadNotifier(async (request) => {
    assert.equal(request.model, 'gpt-6.1-terra');
    assert.equal(request.reasoning_effort, 'high');
    assert.equal(request.max_completion_tokens, 8192);
    assert.equal(request.max_tokens, undefined);
    return { choices: [{ message: { content: 'Spend is $3.32.' } }] };
  });
  assert.equal(await notify({ openaiTotal: 3.32 }, null), 'Spend is $3.32.');
});

test('Astra override uses medium and API failures keep the existing fallback', async () => {
  const notify = loadNotifier(async (request) => {
    assert.equal(request.model, 'gpt-6-astra');
    assert.equal(request.reasoning_effort, 'medium');
    throw Error('unavailable');
  });
  assert.equal(await notify({ openaiTotal: 3.32 }, null, 'gpt-6-astra'), null);
});
