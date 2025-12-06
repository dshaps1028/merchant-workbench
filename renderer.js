const { useEffect, useState } = React;
const h = React.createElement;

const formatLog = (message) => {
  const time = new Date().toLocaleTimeString();
  return `[${time}] ${message}`;
};

const Shell = ({ children }) => h('div', { className: 'shell' }, children);

const ORDERS_ENDPOINT = 'http://localhost:3001/orders';

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

const LogText = ({ message }) => h('p', { id: 'log' }, message);

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
  const [log, setLog] = useState('No actions yet.');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [nlQuery, setNlQuery] = useState('');
  const [nlProcessing, setNlProcessing] = useState(false);

  useEffect(() => {
    setStatus('Ready');
    setLog(formatLog('Renderer initialized.'));
  }, []);

  const handleAction = () => {
    const response = window.electronAPI?.ping?.() ?? 'unavailable';
    setLog(formatLog(`Ping response: ${response}`));
  };

  const handleFetchOrders = async (queryParams = {}) => {
    setOrdersLoading(true);
    setOrdersError('');
    setStatus('Fetching orders…');
    setLog(formatLog('Fetching orders from MCP HTTP bridge…'));

    try {
      const url = new URL(ORDERS_ENDPOINT);
      const { limit, status: financial_status, since } = queryParams;
      url.searchParams.set('limit', limit || 5);
      if (financial_status) {
        url.searchParams.set('financial_status', financial_status);
      }
      if (since) {
        url.searchParams.set('processed_at_min', since);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      const loaded = data.orders || [];
      setOrders(loaded);
      setLog(formatLog(`Fetched ${loaded.length} orders.`));
      setStatus('Ready');
    } catch (error) {
      setOrdersError(error.message || 'Failed to fetch orders');
      setLog(formatLog(`Failed to fetch orders: ${error.message}`));
      setStatus('Error');
    } finally {
      setOrdersLoading(false);
    }
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
    setLog(formatLog(`Sending to Codex: "${nlQuery.trim()}"`));

    try {
      const codexResponse = await window.electronAPI.codexOrders(nlQuery.trim());
      if (!codexResponse?.ok) {
        throw new Error(codexResponse?.error || 'Codex returned an error');
      }

      const params = codexResponse.data || {};
      setLog(formatLog(`Codex mapped request to: ${JSON.stringify(params)}`));
      await handleFetchOrders({
        limit: params.limit,
        status: params.status,
        since: params.since
      });
    } catch (error) {
      setOrdersError(error.message || 'Failed to process Codex request');
      setStatus('Error');
      setLog(formatLog(`Codex failed: ${error.message}`));
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
      Shell,
      null,
      h(Header, { status, label: 'Order Management Hub' }),
      h(
        Main,
        null,
        h(
          Panel,
          {
            title: 'Orders',
            description: 'Fetch recent orders from the Shopify MCP HTTP bridge.'
          },
          h(
            'div',
            { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' } },
            h(ActionButton, { onClick: handleFetchOrders }, 'Fetch orders'),
            ordersLoading ? h('span', { className: 'order-sub' }, 'Loading…') : null
          ),
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
              nlProcessing ? 'Working…' : 'Ask Codex'
            )
          ),
          h(OrdersList, { orders, loading: ordersLoading, error: ordersError })
        ),
        h(Panel, { title: 'Output', id: 'log-panel' }, h(LogText, { message: log }))
      )
    )
  );
}

const root = document.getElementById('root');
ReactDOM.createRoot(root).render(h(App));
