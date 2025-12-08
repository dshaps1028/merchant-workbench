const { useEffect, useState, useRef } = React;
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

const Modal = ({ order, onClose, onEdit }) => {
  if (!order) return null;
  const safeOrder = {
    name: order.name || order.id || 'Order',
    id: order.id || 'N/A',
    total_price: order.total_price || 'N/A',
    currency: order.currency || '',
    email: order.email || (order.customer && order.customer.email) || 'N/A',
    financial_status: order.financial_status || 'unknown',
    fulfillment_status: order.fulfillment_status || 'unfulfilled',
    created_at: order.created_at,
    line_items: Array.isArray(order.line_items) ? order.line_items : []
  };
  return h(
    'div',
    {
      style: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(6px)',
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
          background: 'rgba(255,255,255,0.12)',
          color: '#e8f4ec',
          borderRadius: '6px',
          padding: '20px',
          width: 'min(780px, 90vw)',
          maxHeight: '85vh',
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 18px 38px rgba(0,0,0,0.4)',
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
            borderRadius: '6px',
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
      h(
        'div',
        {
          style: {
            position: 'absolute',
            top: '10px',
            left: '10px',
            display: 'flex',
            gap: '8px'
          }
        },
        h(
          'button',
          {
            onClick: onEdit,
            style: {
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(149,191,72,0.2)',
              color: '#0f1b14',
              border: '1px solid rgba(149,191,72,0.6)',
              fontWeight: 700,
              cursor: 'pointer'
            }
          },
          'Edit Order'
        )
      ),
      h('h2', null, order.name || `Order #${order.id}`),
      h(
        'p',
        { className: 'order-sub' },
        `Status: ${safeOrder.financial_status} / ${safeOrder.fulfillment_status}`
      ),
      h(
        'p',
        { className: 'order-sub' },
        `Email: ${safeOrder.email}`
      ),
      h(
        'p',
        { className: 'order-sub' },
        `Total: ${safeOrder.total_price !== 'N/A' ? `$${safeOrder.total_price} ${safeOrder.currency}` : '—'}`
      ),
      h(
        'p',
        { className: 'order-sub' },
        `Date: ${
          safeOrder.created_at ? new Date(safeOrder.created_at).toLocaleString() : 'N/A'
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
};

const ScheduleModal = ({
  orderText,
  onClose,
  submitting,
  messages,
  onSendMessage,
  onInputChange,
  messagesEndRef
}) =>
  h(
    'div',
    {
      style: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(6px)',
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
          background: 'rgba(255,255,255,0.12)',
          color: '#e8f4ec',
          borderRadius: '6px',
          padding: '20px',
          width: 'min(780px, 90vw)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 18px 38px rgba(0,0,0,0.4)',
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
            borderRadius: '6px',
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
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '60vh',
            overflowY: 'auto',
            paddingRight: '4px'
          }
        },
        h(
          'div',
          {
            style: {
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }
          },
          messages.map((m, idx) =>
            h(
              'div',
              {
            key: idx,
            style: {
              alignSelf: m.role === 'assistant' ? 'flex-start' : 'flex-end',
              background: m.role === 'assistant' ? '#f1f4f2' : 'rgba(149,191,72,0.2)',
              padding: '8px 10px',
              borderRadius: '6px'
            }
          },
          h(
            'p',
            { className: 'order-sub', style: { margin: 0, whiteSpace: 'pre-wrap', color: '#0f1b14' } },
            m.text
          )
          )
        )
      ),
        h('div', { ref: messagesEndRef })
      ),
      h(
        'div',
        { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        h('input', {
          id: 'create-order-text',
          type: 'text',
          value: orderText,
          onChange: (e) => onInputChange(e.target.value),
          placeholder: 'Tell me the order you want to create…',
          style: {
            flex: '1 1 auto',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: '#e8f4ec'
          },
          onKeyDown: (e) => {
            if (e.key === 'Enter') {
              onSendMessage(orderText);
            }
          },
          disabled: submitting
        }),
        h(
          'button',
          {
            onClick: () => onSendMessage(orderText),
            disabled: submitting || !orderText.trim(),
            style: {
              padding: '10px 14px',
              borderRadius: '6px',
              background: submitting ? 'rgba(255,255,255,0.3)' : '#000',
              color: '#fff',
              fontWeight: 700,
              letterSpacing: '0.3px',
              cursor: submitting || !orderText.trim() ? 'not-allowed' : 'pointer'
            }
          },
          submitting ? 'Working…' : 'Send'
        )
      )
    )
  );

const EditOrdersModal = ({
  open,
  onClose,
  orderCount,
  messages,
  onSendMessage,
  onInputChange,
  inputValue,
  submitting,
  messagesEndRef
}) => {
  if (!open) return null;
  const title = orderCount === 1 ? 'Edit Order' : 'Edit Orders';
  return h(
    'div',
    {
      style: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(6px)',
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
          background: 'rgba(255,255,255,0.12)',
          color: '#e8f4ec',
          borderRadius: '6px',
          padding: '20px',
          width: 'min(780px, 90vw)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 18px 38px rgba(0,0,0,0.4)',
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
            borderRadius: '6px',
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
      h('h2', null, title),
      h(
        'p',
        { className: 'order-sub', style: { marginTop: 0 } },
        orderCount === 1
          ? 'Tell me what to change for this order.'
          : 'Tell me what to change for these orders in bulk.'
      ),
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '60vh',
            overflowY: 'auto',
            paddingRight: '4px'
          }
        },
        h(
          'div',
          {
            style: {
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }
          },
          messages.map((m, idx) =>
            h(
              'div',
              {
                key: idx,
                style: {
                  alignSelf: m.role === 'assistant' ? 'flex-start' : 'flex-end',
                  background: m.role === 'assistant' ? '#f1f4f2' : 'rgba(149,191,72,0.2)',
                  padding: '8px 10px',
                  borderRadius: '6px'
                }
              },
              h(
                'p',
                { className: 'order-sub', style: { margin: 0, whiteSpace: 'pre-wrap', color: '#0f1b14' } },
                m.text
              )
            )
          )
        ),
        h('div', { ref: messagesEndRef })
      ),
      h(
        'div',
        { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        h('input', {
          type: 'text',
          value: inputValue,
          onChange: (e) => onInputChange(e.target.value),
          placeholder: 'Describe the edits you want…',
          style: {
            flex: '1 1 auto',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: '#e8f4ec'
          },
          onKeyDown: (e) => {
            if (e.key === 'Enter') {
              onSendMessage(inputValue);
            }
          },
          disabled: submitting
        }),
        h(
          'button',
          {
            onClick: () => onSendMessage(inputValue),
            disabled: submitting || !inputValue.trim(),
            style: {
              padding: '10px 14px',
              borderRadius: '6px',
              background: submitting ? 'rgba(255,255,255,0.3)' : '#000',
              color: '#fff',
              fontWeight: 700,
              letterSpacing: '0.3px',
              cursor: submitting || !inputValue.trim() ? 'not-allowed' : 'pointer'
            }
          },
          submitting ? 'Working…' : 'Send'
        )
      )
    )
  );
};

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
  const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const explicitDateMatch =
    query.match(/\b\d{4}-\d{2}-\d{2}\b/) ||
    query.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i);
  const monthOnlyMatch = query.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b(?:\s+(\d{4}))?/i
  );

  if (explicitDateMatch) {
    const parsed = Date.parse(explicitDateMatch[0]);
    if (!Number.isNaN(parsed)) {
      const parsedDate = new Date(parsed);
      rangeStart = startOfDay(parsedDate);
      rangeEnd = endOfDay(parsedDate);
    }
  } else if (monthOnlyMatch) {
    const monthToken = monthOnlyMatch[1].toLowerCase().slice(0, 3);
    const monthIndex =
      ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(
        monthToken === 'sep' && monthOnlyMatch[1].toLowerCase().startsWith('sept') ? 'sep' : monthToken
      );
    const now = new Date();
    const year = monthOnlyMatch[2] ? Number(monthOnlyMatch[2]) : now.getFullYear();
    if (monthIndex !== -1) {
      const effectiveYear =
        !monthOnlyMatch[2] && monthIndex > now.getMonth() ? now.getFullYear() - 1 : year;
      rangeStart = new Date(effectiveYear, monthIndex, 1, 0, 0, 0, 0);
      rangeEnd = new Date(effectiveYear, monthIndex + 1, 0, 23, 59, 59, 999);
    }
  } else if (lcQuery.match(/\b(last|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)) {
    const weekdayMatch = lcQuery.match(/\b(last|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    const mode = weekdayMatch && weekdayMatch[1] ? weekdayMatch[1].trim() : '';
    const dayToken = weekdayMatch ? weekdayMatch[2] : '';
    const targetIndex = weekdayNames.indexOf(dayToken);
    if (targetIndex !== -1) {
      const now = new Date();
      const nowIndex = now.getDay(); // 0 = Sunday
      let diff = (nowIndex - targetIndex + 7) % 7;
      if (mode === 'last' && diff === 0) {
        diff = 7; // force previous week
      }
      const targetDate = new Date(now.getTime() - diff * dayMs);
      rangeStart = startOfDay(targetDate);
      rangeEnd = endOfDay(targetDate);
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
  const [createdOrders, setCreatedOrders] = useState([]);
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
  const [createSku, setCreateSku] = useState('');
  const [createVariantId, setCreateVariantId] = useState('');
  const [createQuantity, setCreateQuantity] = useState(1);
  const [createEmail, setCreateEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState(null);
  const [billingAddress, setBillingAddress] = useState(null);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Tell me the order you want to create. I can search products and build the draft.' }
  ]);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMessages, setEditMessages] = useState([
    { role: 'assistant', text: 'Tell me what to change for these orders (email, addresses, tags, note, status).' }
  ]);
  const [editInput, setEditInput] = useState('');
  const [editProcessing, setEditProcessing] = useState(false);
  const [editTargets, setEditTargets] = useState([]);
  const messagesEndRef = useRef(null);
  const editMessagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (editMessagesEndRef.current) {
      editMessagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [editMessages, showEditModal]);

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

  const handleEditSendMessage = async (text) => {
    if (!text || !text.trim()) return;
    const trimmed = text.trim();
    setEditMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    const lower = trimmed.toLowerCase();
    const hasQuestion = trimmed.includes('?');
    const parsedTags =
      lower.includes('tag') && /tag/i.test(trimmed) ? parseTagList(trimmed) : [];
    setEditProcessing(true);

    // If tags mentioned but none parsed, ask for them.
    if (lower.includes('tag') && parsedTags.length === 0) {
      setEditMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            'Which tags should I add (or remove)? Provide a comma-separated list, and tell me if they should replace existing tags or be appended.'
        }
      ]);
      setEditProcessing(false);
      setEditInput('');
      return;
    }

    const targetOrders = editTargets.length ? editTargets : orders;

    // Apply tag updates if parsed and target orders available.
    if (parsedTags.length && targetOrders.length) {
      const tagString = parsedTags.join(', ');
      try {
        for (const order of targetOrders) {
          await window.electronAPI.mcpUpdateOrder({
            order_id: order.id,
            tags: tagString
          });
        }
        setEditMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `Tags "${tagString}" applied to ${targetOrders.length} order${targetOrders.length === 1 ? '' : 's'}.`
          }
        ]);
      } catch (error) {
        setEditMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `I tried to update the orders but hit an error: ${error?.message || 'unknown error'}.`
          }
        ]);
      }
      setEditProcessing(false);
      setEditInput('');
      return;
    }

    // Generic Q&A/acknowledgement
    const assistantText = hasQuestion
      ? 'Let me know the field(s) you want to view or change (email, tags, note, addresses), and I will handle it.'
      : 'Tell me the edits to apply (e.g., add tag VIP, update note, change email/address), and I will confirm once done.';
    setEditMessages((prev) => [...prev, { role: 'assistant', text: assistantText }]);
    setEditProcessing(false);
    setEditInput('');
  };

  const sanitizeAddress = (addr) => {
    if (!addr || typeof addr !== 'object') return null;
    const cleaned = {
      name: addr.name || addr.first_name || '',
      address1: addr.address1 || '',
      address2: addr.address2 || '',
      city: addr.city || '',
      province: addr.province || addr.province_code || '',
      zip: addr.zip || '',
      country: addr.country || addr.country_code || '',
      phone: addr.phone || ''
    };
    const hasValue = Object.values(cleaned).some((v) => v && String(v).trim());
    return hasValue ? cleaned : null;
  };

  const parseTagList = (text) => {
    const tags = new Set();
    const quoted = [...text.matchAll(/["']([^"']+)["']/g)].map((m) => m[1].trim());
    quoted.forEach((t) => t && tags.add(t));

    const stopWords = new Set([
      'to',
      'these',
      'those',
      'orders',
      'order',
      'please',
      'the',
      'my',
      'a',
      'an',
      'and',
      'with',
      'for',
      'add',
      'apply',
      'update',
      'change',
      'set',
      'tag',
      'tags'
    ]);

    const parts = text
      .split(/tag[s]?:?/i)
      .slice(1)
      .join(' ')
      .split(/[,|\s]+/);
    parts.forEach((p) => {
      const cleaned = p.trim().replace(/[?!.]/g, '');
      if (!cleaned) return;
      if (stopWords.has(cleaned.toLowerCase())) return;
      if (/^[A-Za-z0-9_-]+$/.test(cleaned)) {
        tags.add(cleaned);
      }
    });

    return Array.from(tags);
  };

  const handleFetchOrders = async (queryParams = {}) => {
    setOrdersLoading(true);
    setOrdersError('');
    setStatus('Fetching orders…');
    setSelectedOrder(null);

    try {
      if (!window.electronAPI?.mcpListOrders) {
        throw new Error('MCP client is not available');
      }

      const normalizedLimit =
        queryParams.limit !== undefined
          ? Math.max(1, Math.min(250, Number(queryParams.limit)))
          : undefined;

      const requestPayload = { ...queryParams };
      if (normalizedLimit && !Number.isNaN(normalizedLimit)) {
        requestPayload.limit = normalizedLimit;
      } else {
        delete requestPayload.limit;
      }

      console.log('[orders] list_orders payload:', JSON.stringify(requestPayload, null, 2));
      const result = await window.electronAPI.mcpListOrders(requestPayload);
      if (!result?.ok) {
        throw new Error(result?.error || 'MCP call failed');
      }

      let loaded = result.orders || [];
      console.log('[orders] list_orders result count:', Array.isArray(loaded) ? loaded.length : 0);
      if (Array.isArray(loaded)) {
        loaded.forEach((order, idx) => {
          console.log(`[orders] result[${idx}]:`, JSON.stringify(order, null, 2));
        });
      }

      // If we queried by name/order_number, avoid client-side filters that could strip it
      if (queryParams.name) {
        setOrders(loaded);
        setSelectedOrder(null);
        setStatus('Ready');
        return;
      }

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
          return (
            name === needle ||
            num === needle ||
            (name && name.includes(needle)) ||
            (num && num.includes(needle))
          );
        });
      }

      // Client-side email filter (Shopify list endpoint doesn't filter by email directly)
      if (queryParams.email) {
        const target = String(queryParams.email).trim().toLowerCase();
        loaded = loaded.filter(
          (o) =>
            (o.email && String(o.email).toLowerCase() === target) ||
            (o.customer && o.customer.email && String(o.customer.email).toLowerCase() === target)
        );
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

      if (queryParams.sku) {
        const target = String(queryParams.sku).trim().toLowerCase();
        loaded = loaded.filter(
          (o) =>
            Array.isArray(o.line_items) &&
            o.line_items.some(
              (item) => item.sku && String(item.sku).trim().toLowerCase() === target
            )
        );
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
      setSelectedOrder(null);
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
    setSchedulerProcessing(false);
    setStatus('Ready');
    setShowScheduleModal(true);
  };

  const handleCreateOrder = async (draftOverride) => {
    if (!window.electronAPI?.mcpCreateOrder) {
      setOrdersError('Order creation tool is not available.');
      setStatus('Error');
      return;
    }
    const variantIdNum = createVariantId ? Number(createVariantId) : null;
    const cleanedShipping = sanitizeAddress(
      draftOverride?.shipping_address || shippingAddress
    );
    const cleanedBilling = sanitizeAddress(
      draftOverride?.billing_address || billingAddress || cleanedShipping
    );
    const effectiveDraft = draftOverride || {
      line_items: [
        {
          sku: createSku.trim() || undefined,
          variant_id: variantIdNum || undefined,
          quantity: Math.max(1, Number(createQuantity) || 1)
        }
      ],
      email: createEmail.trim() || undefined,
      shipping_address: cleanedShipping || undefined,
      billing_address: cleanedBilling || undefined,
      note: schedulerQuery.trim() || undefined,
      test: true
    };
    if (
      !effectiveDraft.line_items ||
      !effectiveDraft.line_items.length ||
      (!effectiveDraft.line_items[0].sku && !effectiveDraft.line_items[0].variant_id)
    ) {
      setOrdersError('Please select a product/variant first.');
      setStatus('Error');
      return;
    }
    setOrdersError('');
    setStatus('Creating order…');
    setSchedulerProcessing(true);
    try {
      const payload = {
        ...effectiveDraft,
        email: effectiveDraft.email || createEmail.trim() || undefined,
        shipping_address:
          sanitizeAddress(effectiveDraft.shipping_address || shippingAddress) || undefined,
        billing_address:
          sanitizeAddress(effectiveDraft.billing_address || billingAddress || shippingAddress) ||
          undefined,
        test: true
      };
      console.log('[orders] create_order payload:', JSON.stringify(payload, null, 2));
      const result = await window.electronAPI.mcpCreateOrder(payload);
      if (!result?.ok) {
        console.error('[orders] create_order failed:', result);
        throw new Error(result?.error || 'Failed to create order');
      }
      console.log('[orders] create_order result:', result);
      if (result.order) {
        const { id, name, total_price, currency } = result.order;
        setCreatedOrders((prev) => [result.order, ...prev]);
        setSelectedOrder(result.order);
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `Order created: ${name || id} • Total: ${total_price || 'N/A'} ${currency || ''}`
          }
        ]);
        alert(`Order created: ${name || id}`);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Order created (no order object returned).' }
        ]);
        alert('Order created, but no order details were returned.');
      }
      setStatus('Ready');
      setShowScheduleModal(false);
      setCreateSku('');
      setCreateQuantity(1);
      setCreateEmail('');
      setShippingAddress(null);
      setBillingAddress(null);
      setProductQuery('');
      setProductResults([]);
      setProductError('');
      setPendingDraft(null);
    } catch (error) {
      console.error('[orders] create_order error:', error);
      setOrdersError(error.message || 'Failed to create order');
      setStatus('Error');
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Order creation failed: ${error?.message || 'Unknown error'}` }
      ]);
    } finally {
      setSchedulerProcessing(false);
    }
  };

  const handleProductSearch = async (overrideQuery) => {
    if (!window.electronAPI?.mcpSearchProducts) {
      setProductError('Product search tool is not available.');
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Product search tool is not available right now.' }
      ]);
      return;
    }
    const queryValue = overrideQuery !== undefined ? overrideQuery : productQuery;
    const cleanedQuery = (queryValue || '').trim();
    setProductError('');
    setProductQuery(cleanedQuery);
    setProductLoading(true);
    try {
      let products = [];
      let resultText = '';

      if (!cleanedQuery && window.electronAPI?.mcpListProducts) {
        const listResult = await window.electronAPI.mcpListProducts({ limit: 50 });
        if (!listResult?.ok) throw new Error(listResult?.error || 'Product list failed');
        products = listResult.products || [];
        resultText = (listResult.text || '').trim();
        console.log('[order-chat] list_products results:', {
          count: products.length,
          titles: products.slice(0, 5).map((p) => p.title || p.handle || p.id),
          text: resultText
        });
      } else {
        const result = await window.electronAPI.mcpSearchProducts({
          query: cleanedQuery,
          limit: 10
        });
        if (!result?.ok) {
          throw new Error(result?.error || 'Product search failed');
        }
        resultText = (result.text || '').trim();
        products = result.products || [];
        console.log('[order-chat] product search results:', {
          query: cleanedQuery,
          count: products.length,
          titles: products.slice(0, 5).map((p) => p.title || p.handle || p.id),
          text: resultText
        });

        if ((!cleanedQuery || products.length === 0) && window.electronAPI?.mcpListProducts) {
          const listResult = await window.electronAPI.mcpListProducts({ limit: 50 });
          if (listResult?.ok && Array.isArray(listResult.products)) {
            products = listResult.products;
            resultText = resultText || (listResult.text || '').trim();
            console.log('[order-chat] fallback list_products results:', {
              count: products.length,
              titles: products.slice(0, 5).map((p) => p.title || p.handle || p.id)
            });
          } else if (listResult?.text) {
            resultText = resultText || listResult.text;
            console.log('[order-chat] fallback list_products text:', listResult.text);
          }
        }
      }

      setProductResults(products);

      const variantLines = [];
      products.forEach((p) => {
        (p.variants || []).forEach((v) => {
          variantLines.push({
            product: p.title || 'Product',
            sku: v.sku || 'N/A',
            id: v.id || 'N/A',
            price: v.price || 'N/A',
            currency: v.currency || ''
          });
        });
      });

      const reply =
        products.length === 0
          ? resultText || 'No products matched that search.'
          : variantLines.length
            ? (() => {
                const maxLines = 20;
                const header =
                  variantLines.length > maxLines
                    ? `Found ${variantLines.length} variants (showing first ${maxLines}):`
                    : `Found ${variantLines.length} variants:`;
                const lines = variantLines.slice(0, maxLines).map((v) => {
                  const price = v.currency ? `${v.price} ${v.currency}` : v.price;
                  return `• ${v.product}\n  SKU: ${v.sku}\n  Variant ID: ${v.id}\n  Price: ${price}\n`;
                });
                return [header, ...lines].join('\n\n');
              })()
            : `Found ${products.length} products, but no variants surfaced.`;

      setChatMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (error) {
      setProductError(error.message || 'Product search failed');
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Product search failed: ${error?.message || 'Unknown error'}` }
      ]);
    } finally {
      setProductLoading(false);
    }
  };

  const handleSendMessage = async (text) => {
    if (!text || !text.trim()) return;
    const trimmed = text.trim();
    setShowScheduleModal(true);

    // Handle pending confirmation flow
    const confirmRegex = /^(confirm|yes|submit|looks good|approve)/i;
    if (pendingDraft && confirmRegex.test(trimmed)) {
      setChatMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
      await handleCreateOrder(pendingDraft);
      return;
    }

    setChatMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setSchedulerProcessing(true);
    try {
      const assistantMessages = [];
      let summaryParts = [];
      const draft = {
        line_items:
          createSku || createVariantId
            ? [
                {
                  sku: createSku || undefined,
                  variant_id: createVariantId ? Number(createVariantId) : undefined,
                  quantity: createQuantity
                }
              ]
            : [],
        note: schedulerQuery || '',
        email: createEmail || null,
        shipping_address: shippingAddress || null,
        billing_address: billingAddress || null
      };
      const result = await window.electronAPI.codexOrderComposer(trimmed, draft);
      if (!result?.ok) {
        console.error('[order-chat] codexOrderComposer error result:', result);
        throw new Error(result?.error || 'Codex order composer failed');
      }
      const raw = result.data || {};
      const data =
        typeof raw === 'string'
          ? (() => {
              try {
                return JSON.parse(raw);
              } catch {
                return { reply: raw };
              }
            })()
          : raw;
      console.log('[order-chat] codex composer data:', data);
      if (data.email) {
        setCreateEmail(String(data.email).trim());
      }
      const nextShipping = data.shipping_address ? sanitizeAddress(data.shipping_address) : null;
      const nextBilling = data.billing_address
        ? sanitizeAddress(data.billing_address)
        : null;
      if (nextShipping) setShippingAddress(nextShipping);
      if (nextBilling) setBillingAddress(nextBilling);
      if (data.note && String(data.note).trim()) {
        setSchedulerQuery(String(data.note).trim());
      }
      let combinedReply = data.reply ? String(data.reply) : '';
      setShowScheduleModal(true);
      if (data.action === 'search') {
        await handleProductSearch(data.search_query);
      }
      if (data.action === 'update_draft') {
        // Keep draft updates to reply only; state still updates SKU/qty
        if (data.line_items && data.line_items.length) {
          const first = data.line_items[0];
          if (first.sku) {
            setCreateSku(first.sku);
          }
          if (first.variant_id) {
            setCreateVariantId(String(first.variant_id));
          }
          if (first.quantity) setCreateQuantity(first.quantity);
        }
      }
      if (!combinedReply) {
        combinedReply = JSON.stringify(data, null, 2);
      }
      console.log('[order-chat] combinedReply:', combinedReply);
      assistantMessages.push({ role: 'assistant', text: combinedReply });
      if (data.action === 'submit' && data.confirm_submit) {
        const summaryLine =
          (createSku || createVariantId) && createQuantity
            ? `About to submit: SKU ${createSku || 'N/A'} / Variant ${createVariantId || 'N/A'} x ${createQuantity}. Please confirm to submit.`
            : 'Draft is ready. Please confirm to submit.';
        setPendingDraft({
          line_items:
            createSku || createVariantId
              ? [
                  {
                    sku: createSku ? createSku.trim() : undefined,
                    variant_id: createVariantId ? Number(createVariantId) : undefined,
                    quantity: Math.max(1, Number(createQuantity) || 1)
                  }
                ]
              : draft.line_items,
          note: schedulerQuery.trim() || undefined,
          email: data.email || createEmail || undefined,
          shipping_address: nextShipping || shippingAddress || undefined,
          billing_address: nextBilling || billingAddress || nextShipping || undefined
        });
        assistantMessages.push({ role: 'assistant', text: summaryLine });
        setSchedulerProcessing(false);
        setChatInput('');
        setShowScheduleModal(true);
        if (assistantMessages.length) {
          setChatMessages((prev) => {
            const next = [...prev, ...assistantMessages];
            console.log('[order-chat] assistantMessages to append (submit):', assistantMessages);
            console.log('[order-chat] appended messages after submit prompt:', next.map((m) => m.text));
            return next;
          });
        }
        return;
      }
      // Heuristic: if user clearly asked about products and no search was run, run a broad search
      const needsProductList =
        !data.action || data.action === 'none' || data.action === 'update_draft';
      if (needsProductList && /\bproduct/i.test(trimmed)) {
        await handleProductSearch('');
      }
      if (assistantMessages.length) {
        setChatMessages((prev) => {
          const next = [...prev, ...assistantMessages];
          console.log('[order-chat] assistantMessages to append:', assistantMessages);
          console.log('[order-chat] appended messages:', next.map((m) => m.text));
          return next;
        });
      }
    } catch (error) {
      setOrdersError(error.message || 'Codex order composer failed');
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Sorry, I hit an error: ${error?.message || 'Unknown error'}` }
      ]);
    } finally {
      setSchedulerProcessing(false);
      setChatInput('');
      setShowScheduleModal(true);
    }
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
    setOrders([]);
    setHasQueriedOrders(false);
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
        console.log('[orders] codex params:', params);
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

      // Heuristic: derive order_number/name if present in raw query and not parsed
      let derivedOrderNumber = params.order_number;
      if (!derivedOrderNumber) {
        const token = nlQuery
          .match(/[#]?[A-Za-z0-9-]{5,}/g)
          ?.find((t) => /[0-9]/.test(t));
        if (token) {
          derivedOrderNumber = token.replace(/^#/, '');
        }
      }

      // Heuristic: treat non-numeric order_id as an order_number/name
      let derivedOrderId = params.order_id;
      if (derivedOrderId) {
        const asString = String(derivedOrderId).trim();
        const isNumeric = /^\d+$/.test(asString);
        if (!isNumeric) {
          if (!derivedOrderNumber) {
            derivedOrderNumber = asString.replace(/^#/, '');
          }
          derivedOrderId = null;
        }
      }

      // If we have an order_number, avoid applying order_id filters to prevent mismatches
      if (derivedOrderNumber) {
        derivedOrderId = null;
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
        const skuMatch = nlQuery.match(/sku\s*[:#]?\s*([A-Z0-9._-]{3,})/i)?.[1];
        if (skuMatch) {
          derivedSku = skuMatch;
        }
      }

      // If we have an order name/number, do not also treat it as SKU
      if (derivedOrderNumber) {
        derivedSku = null;
      }

      const { created_at_min, created_at_max } = deriveDateRangeFromQuery(
        nlQuery,
        params.created_at_min,
        params.created_at_max
      );

      const requestPayload = {
        fulfillment_status: params.fulfillment_status,
        created_at_min,
        created_at_max,
        email: derivedEmail,
        order_id: derivedOrderId,
        // Send the token as name; omit order_number so we only target name
        name: derivedOrderNumber || undefined,
        order_number: undefined,
        customer_name: params.customer_name,
        sku: derivedSku || undefined
      };

      // Strip undefined/null/empty-string fields before sending
      const cleanedPayload = Object.fromEntries(
        Object.entries(requestPayload).filter(
          ([, value]) => value !== undefined && value !== null && value !== ''
        )
      );

      if (derivedLimit !== undefined && derivedLimit !== null) {
        cleanedPayload.limit = derivedLimit;
      }
      if (normalizedStatus) requestPayload.status = normalizedStatus;
      if (normalizedFinancialStatus) requestPayload.financial_status = normalizedFinancialStatus;
      // For exact order lookups, avoid over-filtering with status/date constraints
      if (derivedOrderNumber || derivedOrderId) {
        delete requestPayload.status;
        delete requestPayload.financial_status;
        delete requestPayload.fulfillment_status;
        delete requestPayload.created_at_min;
        delete requestPayload.created_at_max;
        cleanedPayload.status = 'any';
        cleanedPayload.limit = 250;
      }

      await handleFetchOrders(cleanedPayload);
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
    selectedOrder
      ? h(
          Modal,
          { onClose: () => setSelectedOrder(null) },
          h('h2', null, selectedOrder.name || `Order #${selectedOrder.id}`),
          h(
            'p',
            { className: 'order-sub' },
            `Status: ${selectedOrder.financial_status || 'unknown'} / ${selectedOrder.fulfillment_status || 'unfulfilled'}`
          ),
          h(
            'p',
            { className: 'order-sub' },
            `Email: ${selectedOrder.email || (selectedOrder.customer && selectedOrder.customer.email) || 'N/A'}`
          ),
          h(
            'p',
            { className: 'order-sub' },
            `Total: ${selectedOrder.total_price ? `$${selectedOrder.total_price} ${selectedOrder.currency || ''}` : '—'}`
          ),
          h(
            'p',
            { className: 'order-sub' },
            `Date: ${
              selectedOrder.created_at
                ? new Date(selectedOrder.created_at).toLocaleString()
                : 'N/A'
            }`
          ),
          h(
            'div',
            { style: { marginTop: '12px' } },
            h('strong', null, 'Line items:'),
            h(
              'ul',
              { className: 'orders' },
              (selectedOrder.line_items || []).map((item, idx) =>
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
      : null,
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
            ? h(ScheduleModal, {
                onClose: () => {
                  setShowScheduleModal(false);
                  setSchedulerProcessing(false);
                },
                orderText: chatInput,
                submitting: schedulerProcessing,
                messages: chatMessages,
                onSendMessage: handleSendMessage,
                onInputChange: setChatInput,
                messagesEndRef
              })
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
          createdOrders.length
            ? h(
                Panel,
                { title: 'RECENTLY CREATED ORDERS', description: 'Orders you just created' },
                h(OrdersList, {
                  orders: createdOrders,
                  loading: false,
                  error: '',
                  queried: true,
                  onSelect: setSelectedOrder
                })
              )
            : null,
          selectedOrder
            ? h(Modal, {
                order: selectedOrder,
                onClose: () => setSelectedOrder(null),
                onEdit: () => {
                  setEditTargets([selectedOrder]);
                  setShowEditModal(true);
                }
              })
            : null,
          h(EditOrdersModal, {
            open: showEditModal,
            onClose: () => {
              setShowEditModal(false);
              setEditTargets([]);
            },
            orderCount: (editTargets.length || orders.length),
            messages: editMessages,
            onSendMessage: handleEditSendMessage,
            onInputChange: setEditInput,
            inputValue: editInput,
            submitting: editProcessing,
            messagesEndRef: editMessagesEndRef
          }),
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
                h(
                  ActionButton,
                  {
                    onClick: () => {
                      setEditTargets(orders);
                      setShowEditModal(true);
                    }
                  },
                  orders.length === 1 ? 'Edit Order' : 'Edit Orders'
                )
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
