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

const ActionButton = ({ onClick, children }) =>
  h('button', { onClick }, children);

const LogList = ({ entries }) =>
  h(
    'ul',
    { className: 'logs' },
    entries.map((entry, idx) =>
      h(
        'li',
        { key: idx, className: 'log-entry' },
        `${entry.time.toLocaleTimeString()} — ${entry.count} record${entry.count === 1 ? '' : 's'}`
      )
    )
  );

const OrdersList = ({ orders, loading, error }) => {
  if (loading) {
    return h('p', { className: 'order-sub' }, 'Loading orders…');
  }
  if (error) {
    return h('p', { className: 'order-sub' }, error);
  }
  if (!orders.length) {
    return h('p', { className: 'order-sub' }, 'No orders loaded yet.');
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
        )
      )
    )
  );
};

function App() {
  const [status, setStatus] = useState('Loading…');
  const [logs, setLogs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [nlQuery, setNlQuery] = useState('');
  const [nlProcessing, setNlProcessing] = useState(false);
  const [schedulerQuery, setSchedulerQuery] = useState('');
  const [schedulerProcessing, setSchedulerProcessing] = useState(false);

  useEffect(() => {
    setStatus('Ready');
  }, []);

  const addLog = (count) => {
    setLogs((prev) => [...prev, { time: new Date(), count }]);
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

      const limit = Math.max(1, Math.min(50, Number(queryParams.limit) || 5));
      const result = await window.electronAPI.mcpListOrders({ ...queryParams, limit });
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

      setOrders(loaded);
      addLog(loaded.length);
      setStatus('Ready');
    } catch (error) {
      setOrdersError(error.message || 'Failed to fetch orders');
      setStatus('Error');
    } finally {
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
      const codexResponse = await window.electronAPI.codexOrders(nlQuery.trim());
      if (!codexResponse?.ok) {
        throw new Error(codexResponse?.error || 'Codex returned an error');
      }

      const params = codexResponse.data || {};
      // Fallback: if Codex didn't return a limit, try to extract a number from the query text
      let derivedLimit = params.limit;
      if (!derivedLimit) {
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

      await handleFetchOrders({
        limit: derivedLimit,
        status: params.status,
        fulfillment_status: params.fulfillment_status,
        created_at_min: params.created_at_min,
        created_at_max: params.created_at_max,
        email: params.email,
        order_id: params.order_id,
        order_number: derivedOrderNumber,
        customer_name: params.customer_name
      });
    } catch (error) {
      setOrdersError(error.message || 'Failed to process Codex request');
      setStatus('Error');
    } finally {
      setNlProcessing(false);
    }
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
        h(Header, { status, label: 'Recent Queries' }),
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
            ),
            h(OrdersList, { orders, loading: ordersLoading, error: ordersError })
          ),
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
                placeholder: 'Describe the export schedule (e.g., "daily CSV of unfulfilled orders")',
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
