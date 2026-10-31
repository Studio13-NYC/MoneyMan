# OpenAI model routing

Updated 31 October 2026.

Requested policy: lower tier **`gpt-6.1-terra` / high**, upper tier **`gpt-6-astra` / medium**.

Spending-notification wording defaults to GPT-6.1 Terra/high (`OPENAI_MODEL_SIMPLER_TASKS` override). An Astra override uses medium. Chat Completions now uses `max_completion_tokens=8192`, including reasoning. Billing API credentials and behavior are unchanged.

These are repository changes on `codex/openai-model-tiers-20261031`. This document does not certify a deployed service. Existing host environment variables take precedence over model defaults; reconcile the listed overrides when merging/deploying. No API key is added, rotated, or committed.

Official compatibility reference: https://developers.openai.com/api/docs/guides/latest-model

## Validation

`node --test lib/llm-notify.test.js`: 2 passed.

Changed Python/JavaScript files passed syntax checks; `git diff --check` passed. Two small synthetic Responses API checks with an existing Studio13 project key returned completed, valid JSON for Terra/high and Astra/medium. These establish model access for that key, not full application quality or every deployment credential.
