const { contextBridge, ipcRenderer } = require('electron');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

let codexThreadPromise;
let codexInitError = '';
let codexUsingMcp = false;
let codexMcpClientPromise;
let mcpClientPromise;
let openaiClient;

const resolveCodexModels = () => {
  const models = [];
  if (process.env.CODEX_MODEL) models.push(process.env.CODEX_MODEL);
  models.push('gpt-5.1-codex-max', 'gpt-4.1', 'gpt-4o');
  return models;
};

const stripCodeFence = (text = '') => {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:[a-zA-Z0-9]+)?\n?([\s\S]*?)\n?```$/);
  if (fence && fence[1]) {
    return fence[1].trim();
  }
  return trimmed;
};

const resolveCodexCli = () => {
  const vendor = path.join(__dirname, 'node_modules', '@openai', 'codex-sdk', 'vendor');
  const archMap = {
    arm64: 'aarch64-apple-darwin',
    x64: 'x86_64-apple-darwin'
  };
  if (process.platform === 'darwin' && archMap[process.arch]) {
    const candidate = path.join(vendor, archMap[process.arch], 'codex', 'codex');
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'codex';
};

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
console.log(
  '[preload] .env.local loaded (if present), CODEX_API_KEY set:',
  !!process.env.CODEX_API_KEY,
  'OPENAI_API_KEY set:',
  !!process.env.OPENAI_API_KEY
);

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

const hydrateShopCredentials = async () => {
  try {
    const creds = await ipcRenderer.invoke('oauth:getActive');
    if (creds && creds.shop && creds.token) {
      process.env.SHOPIFY_DOMAIN = creds.shop;
      process.env.SHOPIFY_ACCESS_TOKEN = creds.token;
      console.log('[preload] Active shop loaded from keytar:', creds.shop);
    }
  } catch (error) {
    console.error('[preload] Failed to load active shop credentials', error);
  }
};

const getOpenAIClient = () => {
  if (openaiClient) return openaiClient;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    // Electron preload runs in a browser-like context; explicitly allow if key is provided locally.
    dangerouslyAllowBrowser: true
  });
  return openaiClient;
};

const getCodexThread = async () => {
  if (!codexThreadPromise) {
    codexThreadPromise = (async () => {
      try {
        const { Codex } = await import('@openai/codex-sdk');
        const codex = new Codex();
        const preferredModels = resolveCodexModels();

        await hydrateShopCredentials();
        const mcpServerConfig = {
          transport: 'stdio',
          command: process.execPath,
          args: [path.join(__dirname, 'mcp-server', 'index.js')],
          cwd: path.join(__dirname, 'mcp-server'),
          env: {
            ELECTRON_RUN_AS_NODE: '1',
            ...process.env
          }
        };

        let lastErr;
        for (const model of preferredModels) {
          try {
            const thread = await codex.startThread({
              model,
              skipGitRepoCheck: true,
              mcpServers: [mcpServerConfig]
            });
            codexUsingMcp = true;
            console.log('[preload] Codex thread started with MCP stdio', model);
            return thread;
          } catch (mcpErr) {
            lastErr = mcpErr;
            console.warn(
              '[preload] Codex thread MCP start failed; trying next model:',
              model,
              mcpErr?.message || mcpErr
            );
          }
        }
        // Final fallback: no MCP
        const fallbackModel = preferredModels[preferredModels.length - 1];
        const thread = await codex.startThread({ model: fallbackModel, skipGitRepoCheck: true });
        codexUsingMcp = false;
        return thread;
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

const getCodexMcpClient = async () => {
  if (!codexMcpClientPromise) {
    codexMcpClientPromise = (async () => {
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
        command: resolveCodexCli(),
        args: ['mcp-server'],
        cwd: __dirname,
        env: {
          ...process.env
        },
        stderr: 'pipe'
      });

      const stderrStream = transport.stderr;
      if (stderrStream) {
        stderrStream.on('data', (chunk) => {
          console.error('[preload][codex mcp stderr]', chunk.toString());
        });
      }

      const client = new Client({
        name: 'merchant-workbench-codex-mcp',
        version: '0.1.0'
      });

      transport.onerror = (err) => console.error('[preload] codex MCP transport error:', err);
      transport.onclose = () => {
        const proc = transport._process;
        const code = proc ? proc.exitCode : undefined;
        const sig = proc ? proc.signalCode : undefined;
        console.warn('[preload] codex MCP transport closed', { exitCode: code, signal: sig });
        codexMcpClientPromise = null;
      };

      try {
        await client.connect(transport);
        const caps = client.getServerCapabilities();
        if (!caps || !caps.tools) {
          throw new Error('Codex MCP server did not report tool capabilities');
        }
        console.log('[preload] Codex MCP client connected (stdio), capabilities:', caps);
        return { client, transport };
      } catch (error) {
        console.error('[preload] Codex MCP client connect failed:', error);
        try {
          await transport.close?.();
        } catch {}
        codexMcpClientPromise = null;
        throw error;
      }
    })();
  }

  return codexMcpClientPromise;
};

const codexOrders = async (prompt) => {
  if (codexInitError) {
    return { ok: false, error: codexInitError };
  }

  try {
    console.log('[codex] orders prompt:', prompt);
    const thread = await getCodexThread();
    const schema = {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 5 },
        status: { type: 'string', nullable: true },
        financial_status: { type: 'string', nullable: true },
        fulfillment_status: { type: 'string', nullable: true },
        created_at_min: { type: 'string', nullable: true },
        created_at_max: { type: 'string', nullable: true },
        email: { type: 'string', nullable: true },
        order_id: { type: 'string', nullable: true },
        order_number: { type: 'string', nullable: true },
        customer_name: { type: 'string', nullable: true },
        sku: { type: 'string', nullable: true }
      },
      required: [
        'limit',
        'status',
        'financial_status',
        'fulfillment_status',
        'created_at_min',
        'created_at_max',
        'email',
        'order_id',
        'order_number',
        'customer_name',
        'sku'
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
            'If they mention an order status, include it as status. If they mention payment status, include financial_status. ' +
            'If they mention fulfillment state, include fulfillment_status. ' +
            'If they mention a timeframe (e.g., yesterday), set created_at_min and created_at_max to ISO8601 timestamps covering that range. ' +
            'If they mention an email, include it as email. If they mention an order id or number, include order_id or order_number. If they mention a customer name, include customer_name. If they mention a SKU, include sku (exact string).'
        },
        { type: 'text', text: `User request: ${prompt}` }
      ],
      { outputSchema: schema }
    );

    console.log('[codex] orders response:', turn?.finalResponse);
    return { ok: true, data: turn.finalResponse };
  } catch (error) {
    return { ok: false, error: error?.message || 'Codex request failed' };
  }
};

const codexAnalyzeOrders = async (prompt, orders = []) => {
  if (codexInitError) {
    return { ok: false, error: codexInitError };
  }
  try {
    console.log('[codex] analyze prompt:', prompt);
    console.log('[codex] analyze payload (redacted):', JSON.stringify(orders, null, 2));
    const thread = await getCodexThread();
    const schema = {
      type: 'object',
      properties: {
        analysis: { type: 'string' }
      },
      required: ['analysis'],
      additionalProperties: false
    };
    const turn = await thread.run(
      [
        {
          type: 'text',
          text:
            'You are an analyst for Shopify orders. Given a user request and a redacted list of orders (id, name, totals, status, tags, line items titles/SKUs/quantities), produce a concise summary of what matches the request. ' +
            'Return 3-5 short bullet points or sentences. If nothing matches, say so. Do not include PII. Keep it under 800 characters.'
        },
        { type: 'text', text: `User request: ${prompt}` },
        { type: 'text', text: `Orders JSON:\n${JSON.stringify(orders)}` }
      ],
      { outputSchema: schema }
    );
    console.log('[codex] analyze response:', turn?.finalResponse);
    return { ok: true, analysis: turn.finalResponse.analysis || turn.finalResponse };
  } catch (error) {
    return { ok: false, error: error?.message || 'Codex analysis failed' };
  }
};

const codexReport = async (prompt, orders = [], mode = 'trends') => {
  if (codexInitError) {
    return { ok: false, error: codexInitError };
  }
  const normalizedMode = ['csv', 'top', 'trends'].includes(mode) ? mode : 'trends';

  // Attempt Codex-as-MCP first (uses codex mcp-server tools)
  const tryCodexMcp = async () => {
    try {
      const { client } = await getCodexMcpClient();
      const lines = [];
      if (normalizedMode === 'csv') {
        lines.push(
          'Produce a CSV string with a header row. Each row should represent an order line item: columns id,name,total_price,currency,financial_status,fulfillment_status,created_at,tag_list,item_title,item_sku,item_qty. Do not include PII.'
        );
      } else if (normalizedMode === 'top') {
        lines.push(
          'Return JSON with shape {"top":[{"name":string,"total_price":string,"currency":string,"line_item_count":number}]}, sorted by total_price desc, max 10. Do not include PII.'
        );
      } else {
        lines.push(
          'Provide 3-5 concise bullets summarizing trends or notable patterns in the provided orders. No PII. <800 characters.'
        );
      }
      lines.push(`User request: ${prompt}`);
      lines.push(`Orders JSON:\n${JSON.stringify(orders)}`);

      const preferredModels = resolveCodexModels();
      let lastErr;
      for (const model of preferredModels) {
        try {
          const result = await client.callTool({
            name: 'codex',
            arguments: {
              prompt: lines.join('\n'),
              sandbox: 'workspace-write',
              'approval-policy': 'never',
              model
            }
          });

          const text =
            (result.content || [])
              .map((c) => c.text || (c.json ? JSON.stringify(c.json) : ''))
              .filter(Boolean)
              .join('\n')
              .trim() || '';

          if (!text) {
            throw new Error('Empty Codex MCP response');
          }

          if (normalizedMode === 'csv') {
            const csv = stripCodeFence(text) || text;
            console.log('[codex] MCP insights success (csv) via model', model);
            return { ok: true, mode: normalizedMode, data: { csv } };
          }
          if (normalizedMode === 'top') {
            let parsed = null;
            try {
              parsed = JSON.parse(text);
            } catch {}
            if (parsed && Array.isArray(parsed.top)) {
              console.log('[codex] MCP insights success (top) via model', model);
              return { ok: true, mode: normalizedMode, data: { top: parsed.top } };
            }
            throw new Error('Codex MCP top response not parseable');
          }
          console.log('[codex] MCP insights success (trends) via model', model);
          return { ok: true, mode: normalizedMode, data: { analysis: text } };
        } catch (err) {
          lastErr = err;
          console.warn('[codex] MCP insights path failed for model', model, err?.message || err);
        }
      }
      if (lastErr) {
        throw lastErr;
      }
    } catch (err) {
      console.warn('[codex] MCP insights path failed, will fall back:', err?.message || err);
      return { ok: false, error: err?.message || 'Codex MCP report failed' };
    }
  };

  const mcpAttempt = await tryCodexMcp();
  if (mcpAttempt?.ok && mcpAttempt.data) {
    return mcpAttempt;
  }

  // Fallback to schema-only path
  console.log('[codex] insights using schema fallback (Codex MCP unavailable or failed)');
  const thread = await getCodexThread();
  let schema;
  let system;
  if (normalizedMode === 'csv') {
    schema = {
      type: 'object',
      properties: { csv: { type: 'string' } },
      required: ['csv'],
      additionalProperties: false
    };
    system =
      'Produce a CSV string with a header row. Each row should represent an order line item: columns id,name,total_price,currency,financial_status,fulfillment_status,created_at,tag_list,item_title,item_sku,item_qty. ' +
      'Do not include personally identifiable information. Keep the CSV under ~200 lines. If no orders, return a CSV header only.';
  } else if (normalizedMode === 'top') {
    schema = {
      type: 'object',
      properties: {
        top: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', nullable: true },
              total_price: { type: 'string', nullable: true },
              currency: { type: 'string', nullable: true },
              line_item_count: { type: 'integer', nullable: true }
            },
            additionalProperties: false
          }
        }
      },
      required: ['top'],
      additionalProperties: false
    };
    system =
      'Return the top-performing orders based on total_price descending. Provide an array "top" of at most 10 items with name, total_price, currency, and line_item_count. No PII.';
  } else {
    schema = {
      type: 'object',
      properties: { analysis: { type: 'string' } },
      required: ['analysis'],
      additionalProperties: false
    };
    system =
      'You are an analyst for Shopify orders. Given a user request and a redacted list of orders (id, name, totals, status, tags, line items titles/SKUs/quantities), produce a concise summary of what matches the request. ' +
      'Return 3-5 short bullet points or sentences. If nothing matches, say so. Do not include PII. Keep it under 800 characters.';
  }

  try {
    const turn = await thread.run(
      [
        { type: 'text', text: system },
        { type: 'text', text: `User request: ${prompt}` },
        { type: 'text', text: `Orders JSON:\n${JSON.stringify(orders)}` }
      ],
      { outputSchema: schema }
    );
    if (normalizedMode === 'csv') {
      const csv = stripCodeFence(turn.finalResponse.csv || '') || '';
      return { ok: true, mode: normalizedMode, data: { csv } };
    }
    return { ok: true, mode: normalizedMode, data: turn.finalResponse };
  } catch (error) {
    return { ok: false, error: error?.message || 'Codex report failed' };
  }
};

const codexAutomation = async (prompt, defaults = {}) => {
  if (codexInitError) {
    return { ok: false, error: codexInitError };
  }
  try {
    const thread = await getCodexThread();
    const schema = {
      type: 'object',
      properties: {
        schedule: { type: 'string' },
        interval_days: { type: 'integer', nullable: true },
        start_at: { type: 'string', nullable: true },
        end_at: { type: 'string', nullable: true },
        label: { type: 'string', nullable: true },
        action: { type: 'string', nullable: true },
        search_query: { type: 'string', nullable: true },
        confirm: { type: 'boolean', nullable: true }
      },
      required: ['schedule'],
      additionalProperties: false
    };
    const system =
      'You convert a natural-language automation request into a normalized schedule payload. ' +
      'Return a short schedule string (e.g., "every 7 days", "every Monday at 09:00"), an integer interval_days when possible, ' +
      'optional ISO start_at/end_at, and any label/action/search_query hints. Do not invent contacts or PII.';
    const turn = await thread.run(
      [
        { type: 'text', text: system },
        { type: 'text', text: `User request: ${prompt}` },
        { type: 'text', text: `Defaults: ${JSON.stringify(defaults || {})}` }
      ],
      { outputSchema: schema }
    );
    return { ok: true, data: turn.finalResponse };
  } catch (error) {
    return { ok: false, error: error?.message || 'Codex automation parse failed' };
  }
};

const codexOrderComposer = async (prompt, draft) => {
  if (codexInitError) {
    return { ok: false, error: codexInitError };
  }

  try {
    const thread = await getCodexThread();
    const schema = {
      type: 'object',
      properties: {
        reply: { type: 'string' },
        action: {
          type: 'string',
          enum: ['none', 'search', 'update_draft', 'submit']
        },
        search_query: { type: 'string', nullable: true },
        line_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sku: { type: 'string', nullable: true },
              variant_id: { type: 'integer', nullable: true },
              quantity: { type: 'integer', nullable: true },
              title: { type: 'string', nullable: true }
            },
            required: ['sku', 'variant_id', 'quantity', 'title'],
            additionalProperties: false
          },
          nullable: true
        },
        shipping_address: {
          type: 'object',
          properties: {
            name: { type: 'string', nullable: true },
            address1: { type: 'string', nullable: true },
            address2: { type: 'string', nullable: true },
            city: { type: 'string', nullable: true },
            province: { type: 'string', nullable: true },
            zip: { type: 'string', nullable: true },
            country: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true }
          },
          required: ['name', 'address1', 'address2', 'city', 'province', 'zip', 'country', 'phone'],
          additionalProperties: false,
          nullable: true
        },
        billing_address: {
          type: 'object',
          properties: {
            name: { type: 'string', nullable: true },
            address1: { type: 'string', nullable: true },
            address2: { type: 'string', nullable: true },
            city: { type: 'string', nullable: true },
            province: { type: 'string', nullable: true },
            zip: { type: 'string', nullable: true },
            country: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true }
          },
          required: ['name', 'address1', 'address2', 'city', 'province', 'zip', 'country', 'phone'],
          additionalProperties: false,
          nullable: true
        },
        email: { type: 'string', nullable: true },
        note: { type: 'string', nullable: true },
        confirm_submit: { type: 'boolean', nullable: true }
      },
      required: [
        'reply',
        'action',
        'search_query',
        'line_items',
        'shipping_address',
        'billing_address',
        'email',
        'note',
        'confirm_submit'
      ],
      additionalProperties: false
    };

    const turn = await thread.run(
      [
        {
          type: 'text',
          text:
            'You are an order creation assistant. Maintain a draft order from conversation. ' +
            'Use action=search when you need product info (provide search_query). ' +
            'Use action=update_draft with line_items/email/note when updating the draft. ' +
            'Capture shipping_address and billing_address as structured objects (name, address1, address2, city, province, zip, country, phone) whenever the user provides an address; set the field to null when not provided. ' +
            'If required details are missing (SKU or variant, quantity, customer email, shipping/billing info), ask for them explicitly before attempting to submit and wait for the answer. ' +
            'Before submitting, summarize the draft (items, qty, SKU/variant) and ask the user to confirm. ' +
            'Use action=submit only after the user has clearly confirmed creation; set confirm_submit=true in that case. ' +
            'Respond with a helpful reply in reply. Always include every field in the schema; when a field is not applicable, set it to null (or [] for line_items).'
        },
        { type: 'text', text: `Current draft JSON: ${JSON.stringify(draft || {})}` },
        { type: 'text', text: `User: ${prompt}` }
      ],
      { outputSchema: schema }
    );

    return { ok: true, data: turn.finalResponse };
  } catch (error) {
    return { ok: false, error: error?.message || 'Codex order composer failed' };
  }
};

const codexIsUsingMcp = () => codexUsingMcp;

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
    await hydrateShopCredentials();
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

const mcpCreateOrder = async (params) => {
  try {
    await hydrateShopCredentials();
    const { client } = await getMcpClient();
    const result = await client.callTool({
      name: 'create_order',
      arguments: params
    });

    const order =
      (result.structuredContent && result.structuredContent.order) ||
      (result.content || [])
        .flatMap((item) => item.json?.order || item.text?.order || [])
        .find(Boolean);

    return {
      ok: true,
      order: order || null,
      text: (result.content && result.content.map((c) => c.text).filter(Boolean).join('\n')) || ''
    };
  } catch (error) {
    console.error('[preload] MCP create_order failed:', error);
    return { ok: false, error: error?.message || 'MCP create_order failed' };
  }
};

const mcpUpdateOrder = async (params) => {
  try {
    const { client } = await getMcpClient();
    const result = await client.callTool({
      name: 'update_order',
      arguments: params
    });

    const order =
      (result.structuredContent && result.structuredContent.order) ||
      (result.content || [])
        .flatMap((item) => item.json?.order || item.text?.order || [])
        .find(Boolean);

    return {
      ok: true,
      order: order || null,
      text: (result.content && result.content.map((c) => c.text).filter(Boolean).join('\n')) || ''
    };
  } catch (error) {
    console.error('[preload] MCP update_order failed:', error);
    return { ok: false, error: error?.message || 'MCP update_order failed' };
  }
};

const mcpSearchProducts = async (params) => {
  try {
    await hydrateShopCredentials();
    const { client } = await getMcpClient();
    const result = await client.callTool({
      name: 'search_products',
      arguments: params
    });

    const products =
      (result.structuredContent && result.structuredContent.products) ||
      (result.content || [])
        .flatMap((item) => item.json?.products || item.text?.products || [])
        .filter(Boolean);

    return {
      ok: true,
      products: Array.isArray(products) ? products : [],
      text: (result.content && result.content.map((c) => c.text).filter(Boolean).join('\n')) || ''
    };
  } catch (error) {
    console.error('[preload] MCP search_products failed:', error);
    return { ok: false, error: error?.message || 'MCP search_products failed' };
  }
};

const mcpListProducts = async (params) => {
  try {
    await hydrateShopCredentials();
    const { client } = await getMcpClient();
    const result = await client.callTool({
      name: 'list_products',
      arguments: params
    });

    const products =
      (result.structuredContent && result.structuredContent.products) ||
      (result.content || [])
        .flatMap((item) => item.json?.products || item.text?.products || [])
        .filter(Boolean);

    return {
      ok: true,
      products: Array.isArray(products) ? products : [],
      text: (result.content && result.content.map((c) => c.text).filter(Boolean).join('\n')) || ''
    };
  } catch (error) {
    console.error('[preload] MCP list_products failed:', error);
    return { ok: false, error: error?.message || 'MCP list_products failed' };
  }
};

const mcpGetOrder = async (params) => {
  try {
    await hydrateShopCredentials();
    const { client } = await getMcpClient();
    const result = await client.callTool({
      name: 'get_order',
      arguments: params
    });
    const order =
      result.structuredContent?.order ||
      (result.content || [])
        .flatMap((item) => item.json?.order || item.text?.order || [])
        .find(Boolean) ||
      null;
    return { ok: true, order };
  } catch (error) {
    console.error('[preload] MCP get_order failed:', error);
    return { ok: false, error: error?.message || 'MCP get_order failed' };
  }
};

const mcpGetShopInfo = async () => {
  try {
    await hydrateShopCredentials();
    const { client } = await getMcpClient();
    const result = await client.callTool({ name: 'get_shop_info', arguments: {} });
    const info =
      result.structuredContent?.shop ||
      (result.content || [])
        .flatMap((item) => item.json?.shop || item.text?.shop || [])
        .find(Boolean) ||
      result.structuredContent ||
      null;
    return { ok: true, shop: info };
  } catch (error) {
    console.error('[preload] MCP get_shop_info failed:', error);
    return { ok: false, error: error?.message || 'MCP get_shop_info failed' };
  }
};

const saveOrdersResult = (payload) => ipcRenderer.invoke('orders:saveResult', payload);
const listSavedOrders = (limit = 1) => ipcRenderer.invoke('orders:list', limit);
const saveCreatedOrders = (payload) => ipcRenderer.invoke('ordersCreated:save', payload);
const listCreatedOrders = (limit = 1) => ipcRenderer.invoke('ordersCreated:list', limit);
const deleteAutomation = (id) => ipcRenderer.invoke('automations:delete', id);

const openaiFunctionExecutors = {
  list_orders: mcpListOrders,
  create_order: mcpCreateOrder,
  update_order: mcpUpdateOrder,
  get_order: mcpGetOrder,
  search_products: mcpSearchProducts,
  list_products: mcpListProducts,
  draft_order_intent: async (args) => ({ ok: true, data: args || {} })
};

const openaiChatWithFunctions = async ({
  messages = [],
  functions = [],
  model = 'gpt-4o-mini',
  temperature = 0,
  forceFunction
} = {}) => {
  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model,
      messages,
      functions,
      function_call: forceFunction ? { name: forceFunction } : 'auto',
      temperature
    });

    const choice = completion?.choices?.[0];
    const message = choice?.message;
    if (!message) {
      return { ok: false, error: 'No completion message returned' };
    }

    if (message.function_call) {
      const { name, arguments: argsJson } = message.function_call;
      const executor = openaiFunctionExecutors[name];
      if (!executor) {
        return { ok: false, error: `Unsupported function: ${name}` };
      }

      let args = {};
      try {
        args = argsJson ? JSON.parse(argsJson) : {};
      } catch {
        return { ok: false, error: 'Invalid function_call arguments JSON' };
      }

      const fnResult = await executor(args);
      const followup = await client.chat.completions.create({
        model,
        messages: [
          ...messages,
          message,
          { role: 'function', name, content: JSON.stringify(fnResult) }
        ]
      });

      return {
        ok: true,
        message: followup?.choices?.[0]?.message || null,
        called: { name, args, result: fnResult }
      };
    }

    if (forceFunction && forceFunction !== '') {
      return { ok: false, error: 'Model did not return a function call when one was required.' };
    }

    return { ok: true, message };
  } catch (error) {
    console.error('[preload] openaiChatWithFunctions failed:', error);
    return { ok: false, error: error?.message || 'OpenAI function call failed' };
  }
};

const automationRunHandlers = new Set();
ipcRenderer.on('automation:run', (_event, payload) => {
  automationRunHandlers.forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      console.error('[preload] automation run handler failed:', err);
    }
  });
});

const onAutomationRun = (handler) => {
  if (typeof handler !== 'function') return () => {};
  automationRunHandlers.add(handler);
  return () => automationRunHandlers.delete(handler);
};

const api = {
  ping: () => 'ready',
  codexOrders,
  codexAnalyzeOrders,
  codexReport,
  codexAutomation,
  codexOrderComposer,
  codexIsUsingMcp,
  oauthStart: (shop) => ipcRenderer.invoke('oauth:start', shop),
  oauthList: () => ipcRenderer.invoke('oauth:list'),
  oauthGetActive: () => ipcRenderer.invoke('oauth:getActive'),
  oauthSetActive: (shop) => ipcRenderer.invoke('oauth:setActive', shop),
  oauthSetClientCreds: (id, secret) => ipcRenderer.invoke('oauth:setClientCreds', id, secret),
  oauthGetClientCreds: () => ipcRenderer.invoke('oauth:getClientCreds'),
  oauthSetToken: (shop, token) => ipcRenderer.invoke('oauth:setToken', shop, token),
  oauthLogout: () => ipcRenderer.invoke('oauth:logout'),
  automationsList: () => ipcRenderer.invoke('automations:list'),
  automationsSave: (payload) => ipcRenderer.invoke('automations:save', payload),
  automationsUpdate: (payload) => ipcRenderer.invoke('automations:update', payload),
  automationsDelete: deleteAutomation,
  onAutomationRun,
  ordersCacheSave: saveOrdersResult,
  ordersCacheList: listSavedOrders,
  ordersCreatedSave: saveCreatedOrders,
  ordersCreatedList: listCreatedOrders,
  openaiChatWithFunctions,
  mcpGetShopInfo,
  mcpListOrders,
  mcpCreateOrder,
  mcpUpdateOrder,
  mcpGetOrder,
  mcpSearchProducts,
  mcpListProducts
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
