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

const Modal = ({ order, onClose }) =>
  h(
    'div',
    {
      style: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      },
      onClick: onClose
    },
    h(
      'div',
      {
        style: {
          background: '#0f2a1f',
          color: '#e8f4ec',
          borderRadius: '12px',
          padding: '20px',
          width: 'min(720px, 92vw)',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 14px 32px rgba(0,0,0,0.35)',
          position: 'relative'
        },
        onClick: (e) => e.stopPropagation()
      },
      h(
        'button',
        {
          onClick: onClose,
          style: {
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#000',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e8f4ec',
            border: '1px solid rgba(255,255,255,0.15)'
          }
        },
        '✕'
      ),
      h('h2', null, order.name || `Order #${order.id}`),
      h(
        'p',
        { className: 'order-sub' },
        `Status: ${order.financial_status || 'unknown'} / ${order.fulfillment_status || 'unfulfilled'}`
      ),
      h(
        'p',
        { className: 'order-sub' },
        `Email: ${order.email || (order.customer && order.customer.email) || 'N/A'}`
      ),
      h(
        'p',
        { className: 'order-sub' },
        `Total: ${order.total_price ? `$${order.total_price} ${order.currency || ''}` : '—'}`
      ),
      h(
        'p',
        { className: 'order-sub' },
        `Date: ${
          order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'
        }`
      ),
      h(
        'div',
        { style: { marginTop: '12px' } },
        h('strong', null, 'Line items:'),
        h(
          'ul',
          { className: 'orders' },
          (order.line_items || []).map((item, idx) =>
            h(
              'li',
              { key: `${item.id || idx}-${item.sku || idx}`, className: 'order-row' },
              h('p', { className: 'order-id' }, `${item.title || 'Item'} x${item.quantity || 1}`),
              h(
                'p',
                { className: 'order-sub' },
                `SKU: ${item.sku || 'N/A'} • Price: ${item.price ? `$${item.price}` : '—'}`
              )
            )
          )
        )
      )
    )
  );

const ScheduleModal = ({ query, onClose }) =>
  h(
    'div',
    {
      style: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      },
      onClick: onClose
    },
    h(
      'div',
      {
        style: {
          background: '#0f2a1f',
          color: '#e8f4ec',
          borderRadius: '12px',
          padding: '20px',
          width: 'min(520px, 90vw)',
          boxShadow: '0 14px 32px rgba(0,0,0,0.35)',
          position: 'relative'
        },
        onClick: (e) => e.stopPropagation()
      },
      h(
        'button',
        {
          onClick: onClose,
          style: {
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#000',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e8f4ec',
            border: '1px solid rgba(255,255,255,0.15)'
          }
        },
        '✕'
      ),
      h('h2', null, 'Create Order'),
      h(
        'p',
        { className: 'order-sub' },
        query && query.trim()
          ? `Requested: ${query.trim()}`
          : 'Describe the order you want to create.'
      ),
      h(
        'p',
        { className: 'order-sub' },
        'Order creation via AI is coming soon. Close this dialog to continue.'
      ),
      h(
        'div',
        { style: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
        h('label', { htmlFor: 'create-order-notes', className: 'order-sub' }, 'Notes'),
        h('input', {
          id: 'create-order-notes',
          type: 'text',
          placeholder: 'Add any notes for this order...',
          style: {
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: '#e8f4ec'
          }
        })
      )
    )
  );

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

const OrdersList = ({ orders, loading, error, queried, onSelect }) => {
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
        {
          key: order.id,
          className: 'order-row',
          onClick: () => onSelect && onSelect(order),
          style: { cursor: onSelect ? 'pointer' : undefined }
        },
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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

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
    setSelectedOrder(null);

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
    setSchedulerProcessing(true);
    setStatus('Preparing schedule…');
    setShowScheduleModal(true);
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

      // Heuristic: derive "yesterday" date range if missing
      let created_at_min = params.created_at_min;
      let created_at_max = params.created_at_max;
      const lcQuery = nlQuery.toLowerCase();
      if (!created_at_min && !created_at_max && lcQuery.includes('yesterday')) {
        const now = new Date();
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          0,
          0,
          0
        );
        const end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          23,
          59,
          59,
          999
        );
        created_at_min = start.toISOString();
        created_at_max = end.toISOString();
      }

      const requestPayload = {
        limit: derivedLimit,
        fulfillment_status: params.fulfillment_status,
        created_at_min,
        created_at_max,
        email: params.email,
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
      title: [
        'Shopif',
        h(
          'strong',
          {
            className: 'ai-accent',
            style: {
              color: 'rgba(149, 191, 72, 0.9)',
              fontWeight: 700,
              border: '2px solid rgba(149, 191, 72, 0.9)',
              borderRadius: '6px',
              padding: '2px 6px',
              marginLeft: '6px',
              display: 'inline-block'
            }
          },
          'AI'
        )
      ],
      subtitle:
        'Manage your orders, analyze your order data and learn more about Shopify all in one place'
    }),
    h(
      'div',
      { className: 'layout' },
      h(
        Shell,
        null,
        h(Header, { status, label: 'My Automations' }),
        h(Main, null, logs.length ? h('div', { id: 'log-panel' }, h(LogList, { entries: logs })) : null)
      ),
      h(
        Shell,
        null,
        h(Header, { status, label: 'Order Management Hub' }),
        h(
          Main,
          null,
          showScheduleModal
            ? h(ScheduleModal, { query: schedulerQuery, onClose: () => setShowScheduleModal(false) })
            : null,
          h(
            Panel,
            {
              title: 'CREATE A NEW ORDER',
              description: 'Chat with our order agent and create orders without touching the Shopify console'
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
              h(
                ActionButton,
                {
                  onClick: handleSchedule,
                  disabled: schedulerProcessing
                },
                schedulerProcessing ? 'Working…' : 'Get Started'
              )
            )
          ),
          selectedOrder
            ? h(Modal, { order: selectedOrder, onClose: () => setSelectedOrder(null) })
            : null,
          h(
            Panel,
            {
              title: 'SEARCH FOR ORDERS',
              description: 'Make edits, diagnose issues, and generate reports using plain english'
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
                placeholder: '"show 3 pending orders from yesterday"',
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
          h(OrdersList, {
            orders,
            loading: ordersLoading,
            error: ordersError,
            queried: hasQueriedOrders,
            onSelect: setSelectedOrder
          })
        )
      )
    )
  );
}

const root = document.getElementById('root');
ReactDOM.createRoot(root).render(h(App));
