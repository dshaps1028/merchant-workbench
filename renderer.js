const { useEffect, useState } = React;
const h = React.createElement;

const Shell = ({ children }) => h('div', { className: 'shell' }, children);

const PageTitle = ({ title, subtitle }) =>
  h(
    'div',
    { className: 'page-title' },
    h('h1', null, title),
    h('span', null, subtitle)
  );

const StatusBadge = ({ status }) =>
  h(
    'div',
    { className: 'status' },
    h('span', { className: 'dot' }),
    h('span', null, status)
  );

const Header = ({ status, label }) =>
  h(
    'header',
    null,
    h('p', { className: 'eyebrow' }, label ?? 'Status')
  );

const Main = ({ children }) => h('main', null, children);

const Panel = ({ title, description, id, children }) =>
  h(
    'div',
    { className: 'panel', id },
    h('h2', null, title),
    description ? h('p', null, description) : null,
    children
  );

const ActionButton = ({ onClick, children, ...rest }) =>
  h('button', { onClick, ...rest }, children);

const LogList = ({ entries }) =>
  h(
    'ul',
    { className: 'logs' },
    entries.map((entry, idx) =>
      h(
        'li',
        { key: idx, className: 'log-entry' },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
          h('strong', null, entry.label || 'Saved query'),
          h(
            'span',
            { className: 'order-sub' },
            `${entry.time.toLocaleTimeString()} • ${entry.count} record${entry.count === 1 ? '' : 's'}`
          )
        )
      )
    )
  );

const OrdersList = ({ orders, loading, error, queried }) => {
  if (loading) {
    return h('p', { className: 'order-sub' }, 'Loading orders…');
  }
  if (error) {
    return h('p', { className: 'order-sub' }, error);
  }
  if (!queried) {
    return null;
  }
  if (!orders.length) {
    return h('p', { className: 'order-sub' }, 'No orders match your query.');
  }

  return h(
    'ul',
    { className: 'orders' },
    orders.map((order) =>
      h(
        'li',
        { key: order.id, className: 'order-row' },
        h(
          'div',
          { className: 'order-meta' },
          h('p', { className: 'order-id' }, order.name || `Order #${order.id}`),
          h(
            'p',
            { className: 'order-sub' },
            `Email: ${order.email || 'N/A'} • ${order.financial_status || 'status unknown'}`
          )
        ),
        h(
          'p',
          { className: 'order-sub' },
          `Total: ${order.total_price ? `$${order.total_price}` : '—'}`
        ),
        h(
          'p',
          { className: 'order-sub' },
          `Date: ${
            order.created_at
              ? new Date(order.created_at).toLocaleString()
              : 'N/A'
          }`
        )
      )
    )
  );
};

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const deriveDateRangeFromQuery = (query, existingMin, existingMax) => {
  let created_at_min = existingMin;
  let created_at_max = existingMax;

  if (created_at_min || created_at_max) {
    return { created_at_min, created_at_max };
  }

  const lcQuery = query.toLowerCase();
  const dayMs = 24 * 60 * 60 * 1000;
  let rangeStart = null;
  let rangeEnd = null;

  const explicitDateMatch =
    query.match(/\b\d{4}-\d{2}-\d{2}\b/) ||
    query.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i);
  if (explicitDateMatch) {
    const parsed = Date.parse(explicitDateMatch[0]);
    if (!Number.isNaN(parsed)) {
      const parsedDate = new Date(parsed);
      rangeStart = startOfDay(parsedDate);
      rangeEnd = endOfDay(parsedDate);
    }
  } else if (lcQuery.includes('last year')) {
    const now = new Date();
    rangeStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    rangeEnd = new Date(now.getFullYear(), 0, 0, 23, 59, 59, 999);
  } else if (lcQuery.includes('past year')) {
    const now = new Date();
    rangeStart = startOfDay(new Date(now.getTime() - 365 * dayMs));
    rangeEnd = endOfDay(now);
  } else if (lcQuery.includes('last month')) {
    const now = new Date();
    rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    rangeEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (
    lcQuery.includes('past month') ||
    /(past|last)\s+30\s+days/.test(lcQuery)
  ) {
    const now = new Date();
    rangeStart = startOfDay(new Date(now.getTime() - 30 * dayMs));
    rangeEnd = endOfDay(now);
  } else if (
    lcQuery.includes('last week') ||
    lcQuery.includes('past week') ||
    /(past|last)\s+7\s+days/.test(lcQuery)
  ) {
    const now = new Date();
    rangeStart = startOfDay(new Date(now.getTime() - 7 * dayMs));
    rangeEnd = endOfDay(now);
  } else if (lcQuery.includes('yesterday')) {
    const now = new Date();
    rangeStart = startOfDay(new Date(now.getTime() - dayMs));
    rangeEnd = endOfDay(new Date(now.getTime() - dayMs));
  } else if (lcQuery.includes('today')) {
    const now = new Date();
    rangeStart = startOfDay(now);
    rangeEnd = endOfDay(now);
  }

  return {
    created_at_min: rangeStart ? rangeStart.toISOString() : created_at_min,
    created_at_max: rangeEnd ? rangeEnd.toISOString() : created_at_max
  };
};

function App() {
  const [status, setStatus] = useState('Loading…');
  const [logs, setLogs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [hasQueriedOrders, setHasQueriedOrders] = useState(false);
  const [nlQuery, setNlQuery] = useState('');
  const [nlProcessing, setNlProcessing] = useState(false);
  const [schedulerQuery, setSchedulerQuery] = useState('');
  const [schedulerProcessing, setSchedulerProcessing] = useState(false);
  const [lastQueryLabel, setLastQueryLabel] = useState('');

  useEffect(() => {
    setStatus('Ready');
  }, []);

  const addLog = ({ count, label }) => {
    setLogs((prev) => [
      ...prev,
      { time: new Date(), count, label: label || 'Saved query' }
    ]);
  };

  const handleAction = () => {};

  const handleFetchOrders = async (queryParams = {}) => {
    setOrdersLoading(true);
    setOrdersError('');
    setStatus('Fetching orders…');

    try {
      if (!window.electronAPI?.mcpListOrders) {
        throw new Error('MCP client is not available');
      }

      const normalizedLimit =
        queryParams.limit !== undefined
          ? Math.max(1, Math.min(50, Number(queryParams.limit)))
          : undefined;

      const requestPayload = { ...queryParams };
      if (normalizedLimit && !Number.isNaN(normalizedLimit)) {
        requestPayload.limit = normalizedLimit;
      } else {
        delete requestPayload.limit;
      }

      const result = await window.electronAPI.mcpListOrders(requestPayload);
      if (!result?.ok) {
        throw new Error(result?.error || 'MCP call failed');
      }

      let loaded = result.orders || [];

      // Client-side guard: enforce exact matches when provided
      if (queryParams.order_id) {
        const target = String(queryParams.order_id).trim().toLowerCase();
        loaded = loaded.filter(
          (o) =>
            String(o.id).toLowerCase() === target ||
            (o.admin_graphql_api_id &&
              String(o.admin_graphql_api_id).toLowerCase().endsWith(target))
        );
      }

      if (queryParams.order_number) {
        const needle = String(queryParams.order_number).trim().toLowerCase().replace(/^#/, '');
        loaded = loaded.filter((o) => {
          const name = o.name ? String(o.name).toLowerCase().replace(/^#/, '') : '';
          const num =
            o.order_number !== undefined ? String(o.order_number).toLowerCase().replace(/^#/, '') : '';
          return name === needle || num === needle;
        });
      }

      // Client-side financial status filter to guard against parsing mismatches
      if (queryParams.financial_status) {
        const target = String(queryParams.financial_status).toLowerCase();
        loaded = loaded.filter(
          (o) => o.financial_status && String(o.financial_status).toLowerCase() === target
        );
      }

      // Client-side order status filter
      if (queryParams.status) {
        const target = String(queryParams.status).toLowerCase();
        loaded = loaded.filter((o) => o.status && String(o.status).toLowerCase() === target);
      }

      // Client-side date range filter (created_at)
      if (queryParams.created_at_min || queryParams.created_at_max) {
        const minMs = queryParams.created_at_min ? Date.parse(queryParams.created_at_min) : null;
        const maxMs = queryParams.created_at_max ? Date.parse(queryParams.created_at_max) : null;
        loaded = loaded.filter((o) => {
          const ts = o.created_at ? Date.parse(o.created_at) : null;
          if (ts === null || Number.isNaN(ts)) return false;
          if (minMs !== null && ts < minMs) return false;
          if (maxMs !== null && ts > maxMs) return false;
          return true;
        });
      }

      setOrders(loaded);
      setStatus('Ready');
    } catch (error) {
      setOrdersError(error.message || 'Failed to fetch orders');
      setStatus('Error');
    } finally {
      setHasQueriedOrders(true);
      setOrdersLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!schedulerQuery.trim()) {
      return;
    }
    setSchedulerProcessing(true);
    setStatus('Preparing schedule…');
    // Placeholder for future MCP tool to create recurring exports
    setTimeout(() => {
      setStatus('Ready');
      setSchedulerProcessing(false);
    }, 300);
  };

  const handleSaveQuery = () => {
    if (!hasQueriedOrders || !orders.length) {
      return;
    }
    const label = lastQueryLabel || (nlQuery && nlQuery.trim()) || 'Saved query';
    addLog({ count: orders.length, label });
  };

  const handleCodexOrders = async () => {
    if (!nlQuery.trim()) {
      return;
    }
    if (!window.electronAPI?.codexOrders) {
      setOrdersError('Codex SDK is not available in this build.');
      setStatus('Error');
      return;
    }

    setNlProcessing(true);
    setOrdersError('');
    setStatus('Interpreting request…');

    try {
      const trimmedQuery = nlQuery.trim();
      if (trimmedQuery) {
        setLastQueryLabel(trimmedQuery);
      }
      const codexResponse = await window.electronAPI.codexOrders(nlQuery.trim());
      if (!codexResponse?.ok) {
        throw new Error(codexResponse?.error || 'Codex returned an error');
      }

      const params = codexResponse.data || {};
      const paymentStatuses = [
        'authorized',
        'pending',
        'paid',
        'partially_paid',
        'partially_refunded',
        'refunded',
        'voided',
        'unpaid'
      ];
      const orderStatuses = ['open', 'closed', 'cancelled', 'any'];
      const normalizeString = (value) =>
        typeof value === 'string' ? value.trim().toLowerCase() : '';
      let normalizedStatus = normalizeString(params.status);
      let normalizedFinancialStatus = normalizeString(params.financial_status);
      const queryTextLc = nlQuery.toLowerCase();

      // Heuristic: derive financial_status from text if Codex didn't return one
      if (!normalizedFinancialStatus) {
        if (queryTextLc.includes('pending') || queryTextLc.includes('awaiting payment')) {
          normalizedFinancialStatus = 'pending';
        } else if (queryTextLc.includes('paid') || queryTextLc.includes('completed payment')) {
          normalizedFinancialStatus = 'paid';
        } else if (queryTextLc.includes('refunded')) {
          normalizedFinancialStatus = 'refunded';
        }
      }

      // Normalize Codex output: treat payment-like statuses as financial_status instead of order status
      if (
        !normalizedFinancialStatus &&
        normalizedStatus &&
        !orderStatuses.includes(normalizedStatus.toLowerCase()) &&
        paymentStatuses.includes(normalizedStatus)
      ) {
        normalizedFinancialStatus = normalizedStatus === 'unpaid' ? 'pending' : normalizedStatus;
        normalizedStatus = '';
      }
      // Fallback: if Codex didn't return a limit, try to extract a number from the query text
      let derivedLimit = params.limit;
      if (derivedLimit === undefined || derivedLimit === null) {
        const match = nlQuery.match(/\b(\d{1,2})\b/);
        if (match) {
          derivedLimit = Number(match[1]);
        }
      }

      // Heuristic: derive order_number if present in raw query and not parsed
      let derivedOrderNumber = params.order_number;
      if (!derivedOrderNumber) {
        const token = nlQuery
          .match(/[#]?[A-Za-z0-9-]{5,}/g)
          ?.find((t) => /[0-9]/.test(t));
        if (token) {
          derivedOrderNumber = token.replace(/^#/, '');
        }
      }

      // Heuristic: extract email if Codex missed it
      let derivedEmail = params.email;
      if (!derivedEmail) {
        const emailMatch = nlQuery.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (emailMatch) {
          derivedEmail = emailMatch[0];
        }
      }

      // Heuristic: extract SKU if Codex missed it (look for "sku ABC-123" patterns)
      let derivedSku = params.sku;
      if (!derivedSku) {
        const skuMatch =
          nlQuery.match(/sku\s*[:#]?\s*([A-Z0-9._-]{3,})/i)?.[1] ||
          nlQuery.match(/\b[A-Z0-9][A-Z0-9._-]{2,}\b/)?.[0];
        if (skuMatch) {
          derivedSku = skuMatch;
        }
      }

      const requestPayload = {
        limit: derivedLimit,
        fulfillment_status: params.fulfillment_status,
        created_at_min,
        created_at_max,
        email: derivedEmail,
        order_id: params.order_id,
        order_number: derivedOrderNumber,
        customer_name: params.customer_name
      };

      if (normalizedStatus) requestPayload.status = normalizedStatus;
      if (normalizedFinancialStatus) requestPayload.financial_status = normalizedFinancialStatus;

      await handleFetchOrders(requestPayload);
    } catch (error) {
      setOrdersError(error.message || 'Failed to process Codex request');
      setStatus('Error');
    } finally {
      setNlProcessing(false);
    }
  };

  const handleSaveQuery = () => {
    if (!hasQueriedOrders) {
      return;
    }
    const label = lastQueryLabel || (nlQuery && nlQuery.trim()) || 'Saved query';
    addLog({ count: orders.length, label });
  };

  return h(
    React.Fragment,
    null,
    h(PageTitle, {
      title: 'Merchant Workbench',
      subtitle:
        'Manage your orders, analyze your order data and learn more about Shopify all in one place'
    }),
    h(
      'div',
      { className: 'layout' },
      h(
        Shell,
        null,
        h(Header, { status, label: 'Saved Queries' }),
        h(Main, null, logs.length ? h('div', { id: 'log-panel' }, h(LogList, { entries: logs })) : null)
      ),
      h(
        Shell,
        null,
        h(Header, { status, label: 'Order Management Hub' }),
        h(
          Main,
          null,
          h(
            Panel,
            {
              title: 'Order Search',
              description: 'search for your Shopify orders using natural language'
            },
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  marginBottom: '12px',
                  flexWrap: 'wrap'
                }
              },
              h('input', {
                type: 'text',
                placeholder: 'Ask Codex: e.g., "show 3 pending orders from yesterday"',
                value: nlQuery,
                onChange: (event) => setNlQuery(event.target.value),
                style: { flex: '1 1 240px' }
              }),
              h(
                ActionButton,
                {
                  onClick: handleCodexOrders,
                  disabled: nlProcessing || ordersLoading || !nlQuery.trim()
                },
                nlProcessing ? 'Working…' : 'Search Shopify'
              )
            )
          ),
          hasQueriedOrders && orders.length > 0 && !ordersLoading && !nlProcessing
            ? h(
                'div',
                {
                  style: {
                    display: 'flex',
                    justifyContent: 'flex-start',
                    marginBottom: '12px'
                  }
                },
                h(ActionButton, { onClick: handleSaveQuery }, 'Save Query & Results')
              )
            : null,
          h(OrdersList, { orders, loading: ordersLoading, error: ordersError, queried: hasQueriedOrders }),
          h(
            Panel,
            {
              title: 'Scheduler',
              description: 'Create a recurring export using natural language'
            },
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  marginBottom: '12px',
                  flexWrap: 'wrap'
                }
              },
              h('input', {
                type: 'text',
                placeholder: 'Describe the export schedule (e.g., \"daily CSV of unfulfilled orders\")',
                value: schedulerQuery,
                onChange: (event) => setSchedulerQuery(event.target.value),
                style: { flex: '1 1 240px' }
              }),
              h(
                ActionButton,
                {
                  onClick: handleSchedule,
                  disabled: schedulerProcessing || !schedulerQuery.trim()
                },
                schedulerProcessing ? 'Working…' : 'Create schedule'
              )
            )
          )
        )
      )
    )
  );
}

const root = document.getElementById('root');
ReactDOM.createRoot(root).render(h(App));
