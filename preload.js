const { contextBridge } = require('electron');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');

let codexThreadPromise;
let codexInitError = '';
let mcpClientPromise;

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

const loadMcpEnv = () => {
  const envPath = path.join(__dirname, 'mcp-server', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key || typeof key !== 'string') continue;
    const value = rest.join('=');
    process.env[key] = value;
  }
};

loadMcpEnv();
console.log(
  '[preload] mcp-server/.env loaded (if present), SHOPIFY_DOMAIN/ACCESS_TOKEN set:',
  !!process.env.SHOPIFY_DOMAIN,
  !!process.env.SHOPIFY_ACCESS_TOKEN
);
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
        fulfillment_status: { type: 'string', nullable: true },
        created_at_min: { type: 'string', nullable: true },
        created_at_max: { type: 'string', nullable: true },
        email: { type: 'string', nullable: true },
        order_id: { type: 'string', nullable: true },
        order_number: { type: 'string', nullable: true },
        customer_name: { type: 'string', nullable: true }
      },
      required: [
        'limit',
        'status',
        'fulfillment_status',
        'created_at_min',
        'created_at_max',
        'email',
        'order_id',
        'order_number',
        'customer_name'
      ],
      additionalProperties: false
    };

    const turn = await thread.run(
      [
        {
          type: 'text',
          text:
            'You map user requests about Shopify orders to simple parameters for an orders API. ' +
            'Return JSON matching the schema. If the user asks for a number of orders, set limit; otherwise default to 5. ' +
            'If they mention a status, include it as status. If they mention fulfillment state, include fulfillment_status. ' +
            'If they mention a timeframe (e.g., yesterday), set created_at_min and created_at_max to ISO8601 timestamps covering that range. ' +
            'If they mention an email, include it as email. If they mention an order id or number, include order_id or order_number. If they mention a customer name, include customer_name.'
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

const getMcpClient = async () => {
  if (!mcpClientPromise) {
    mcpClientPromise = (async () => {
      const clientModuleUrl = pathToFileURL(
        path.join(
          __dirname,
          'node_modules',
          '@modelcontextprotocol',
          'sdk',
          'dist',
          'esm',
          'client',
          'index.js'
        )
      ).href;
      const stdioModuleUrl = pathToFileURL(
        path.join(
          __dirname,
          'node_modules',
          '@modelcontextprotocol',
          'sdk',
          'dist',
          'esm',
          'client',
          'stdio.js'
        )
      ).href;

      const [{ Client }, { StdioClientTransport }] = await Promise.all([
        import(clientModuleUrl),
        import(stdioModuleUrl)
      ]);

      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [path.join(__dirname, 'mcp-server', 'index.js')],
        cwd: path.join(__dirname, 'mcp-server'),
        env: {
          ELECTRON_RUN_AS_NODE: '1',
          ...process.env
        },
        stderr: 'pipe'
      });

      // Log MCP server stderr if available
      const stderrStream = transport.stderr;
      if (stderrStream) {
        stderrStream.on('data', (chunk) => {
          console.error('[preload][mcp stderr]', chunk.toString());
        });
      }

      const client = new Client({
        name: 'merchant-workbench',
        version: '0.1.0'
      });

      transport.onerror = (err) => console.error('[preload] MCP transport error:', err);
      transport.onclose = () => {
        const proc = transport._process;
        const code = proc ? proc.exitCode : undefined;
        const sig = proc ? proc.signalCode : undefined;
        console.warn('[preload] MCP transport closed', { exitCode: code, signal: sig });
        mcpClientPromise = null;
      };

      try {
        await client.connect(transport);
        const caps = client.getServerCapabilities();
        if (!caps || !caps.tools) {
          throw new Error('MCP server did not report tool capabilities');
        }
        console.log('[preload] MCP client connected (stdio), capabilities:', caps);
        return { client, transport };
      } catch (error) {
        console.error(
          '[preload] MCP client connect failed:',
          error,
          'exit info:',
          transport._process ? { code: transport._process.exitCode, signal: transport._process.signalCode } : null
        );
        // Ensure transport stops and clear the promise for retry
        try {
          await transport.close?.();
        } catch {}
        mcpClientPromise = null;
        throw error;
      }
    })();
  }

  return mcpClientPromise;
};

const mcpListOrders = async (params) => {
  try {
    const { client } = await getMcpClient();
    const result = await client.callTool({
      name: 'list_orders',
      arguments: params
    });

    const orders =
      (result.structuredContent && result.structuredContent.orders) ||
      (result.content || [])
        .flatMap((item) => item.json?.orders || item.text?.orders || [])
        .filter(Boolean);

    return {
      ok: true,
      orders: Array.isArray(orders) ? orders : [],
      text: (result.content && result.content.map((c) => c.text).filter(Boolean).join('\n')) || ''
    };
  } catch (error) {
    console.error('[preload] MCP list_orders failed:', error);
    return { ok: false, error: error?.message || 'MCP list_orders failed' };
  }
};

const api = {
  ping: () => 'ready',
  codexOrders,
  mcpListOrders
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
