const { contextBridge } = require('electron');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');

let codexThreadPromise;
let codexInitError = '';

const loadLocalEnv = () => {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key || typeof key !== 'string') continue;
    const value = rest.join('=');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

loadLocalEnv();
console.log('[preload] .env.local loaded (if present), CODEX_API_KEY set:', !!process.env.CODEX_API_KEY);
console.log('[preload] .env.local loaded (if present)');

const getCodexThread = async () => {
  if (!codexThreadPromise) {
    codexThreadPromise = (async () => {
      try {
        const { Codex } = await import('@openai/codex-sdk');
        const codex = new Codex();
        return codex.startThread({ skipGitRepoCheck: true });
      } catch (error) {
        codexInitError =
          error?.message || 'Failed to load @openai/codex-sdk (see console for details)';
        console.error('[preload] Codex init failed:', codexInitError);
        console.error(error);
        throw error;
      }
    })();
  }
  return codexThreadPromise;
};

const codexOrders = async (prompt) => {
  if (codexInitError) {
    return { ok: false, error: codexInitError };
  }

  try {
    const thread = await getCodexThread();
    const schema = {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 5 },
        status: { type: 'string', nullable: true },
        since: { type: 'string', nullable: true }
      },
      required: ['limit', 'status', 'since'],
      additionalProperties: false
    };

    const turn = await thread.run(
      [
        {
          type: 'text',
          text:
            'You map user requests about Shopify orders to simple parameters for an orders API. ' +
            'Return JSON matching the schema. If the user asks for a number of orders, set limit; otherwise default to 5. ' +
            'If they mention a status, include it as status. If they mention a timeframe, include a since ISO8601 string; otherwise leave null.'
        },
        { type: 'text', text: `User request: ${prompt}` }
      ],
      { outputSchema: schema }
    );

    return { ok: true, data: turn.finalResponse };
  } catch (error) {
    return { ok: false, error: error?.message || 'Codex request failed' };
  }
};

const api = {
  ping: () => 'ready',
  codexOrders
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api);
    console.log('[preload] electronAPI exposed with contextIsolation');
  } catch (error) {
    globalThis.electronAPI = api;
    console.warn(
      '[preload] contextBridge expose failed under contextIsolation; using global fallback',
      error?.message
    );
  }
} else {
  // ContextIsolation disabled; fall back to global
  globalThis.electronAPI = api;
  console.warn('[preload] contextIsolation disabled; exposing electronAPI globally');
}
