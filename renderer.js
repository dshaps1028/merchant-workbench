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
    line_items: Array.isArray(order.line_items) ? order.line_items : [],
    customer_name:
      (order.customer &&
        [order.customer.first_name, order.customer.last_name].filter(Boolean).join(' ')) ||
      (order.shipping_address && order.shipping_address.name) ||
      '',
    phone:
      order.phone ||
      (order.customer && order.customer.phone) ||
      (order.shipping_address && order.shipping_address.phone) ||
      '',
    shipping_address: order.shipping_address || null,
    billing_address: order.billing_address || null,
    tags: order.tags || '',
    note: order.note || ''
  };
  const formatAddress = (addr) => {
    if (!addr) return '—';
    const parts = [
      addr.name,
      [addr.address1, addr.address2].filter(Boolean).join(' ').trim(),
      [addr.city, addr.province_code, addr.zip].filter(Boolean).join(', ').replace(/^, /, ''),
      addr.country,
      addr.phone
    ].filter(Boolean);
    return parts.length ? parts.join('\n') : '—';
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
          color: '#fff',
          '--muted': '#fff',
          fontSize: '16px',
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
        'div',
        {
          style: {
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }
        },
        h(
          'a',
          {
            onClick: (e) => {
              e.preventDefault();
              onEdit && onEdit();
            },
            style: {
              color: 'rgba(149,191,72,0.9)',
              textDecoration: 'none',
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer'
            },
            href: '#'
          },
          'Edit Order'
        ),
        h(
          'button',
          {
            onClick: onClose,
            style: {
              width: '28px',
              height: '28px',
              background: '#000',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e8f4ec',
              border: '1px solid rgba(255,255,255,0.15)'
            }
          },
          '✕'
        )
      ),
      h('h2', { style: { marginTop: 0 } }, order.name || `Order #${order.id}`),
      h('hr', {
        style: {
          border: 'none',
          borderTop: '1px solid rgba(255,255,255,0.25)',
          margin: '8px 0'
        }
      }),
      h('strong', { style: { display: 'block', marginBottom: '6px' } }, 'Order Details:'),
      h(
        'p',
        { className: 'order-sub', style: { color: '#fff' } },
        `Status: ${safeOrder.financial_status} / ${safeOrder.fulfillment_status}`
      ),
      h(
        'p',
        { className: 'order-sub', style: { color: '#fff' } },
        `Email: ${safeOrder.email}`
      ),
      h(
        'p',
        { className: 'order-sub', style: { color: '#fff' } },
        `Total: ${safeOrder.total_price !== 'N/A' ? `$${safeOrder.total_price} ${safeOrder.currency}` : '—'}`
      ),
      h(
        'p',
        { className: 'order-sub', style: { color: '#fff' } },
        `Date: ${
          safeOrder.created_at ? new Date(safeOrder.created_at).toLocaleString() : 'N/A'
        }`
      ),
      h(
        'p',
        { className: 'order-sub', style: { color: '#fff' } },
        `Customer: ${safeOrder.customer_name || 'Guest'}${
          safeOrder.phone ? ` • ${safeOrder.phone}` : ''
        }`
      ),
      h(
        'p',
        { className: 'order-sub', style: { color: '#fff' } },
        `Tags: ${safeOrder.tags ? safeOrder.tags : '—'}`
      ),
      safeOrder.note
        ? h(
            'p',
            { className: 'order-sub', style: { whiteSpace: 'pre-wrap', color: '#fff' } },
            `Note: ${safeOrder.note}`
          )
        : null,
      h(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '10px',
            marginTop: '10px'
          }
        },
        h(
          'div',
          { className: 'order-sub', style: { whiteSpace: 'pre-wrap' } },
          h('strong', null, 'Shipping'),
          h('div', null, formatAddress(safeOrder.shipping_address))
        ),
        h(
          'div',
          { className: 'order-sub', style: { whiteSpace: 'pre-wrap' } },
          h('strong', null, 'Billing'),
          h('div', null, formatAddress(safeOrder.billing_address))
        )
      ),
      h(
        'div',
        { style: { marginTop: '12px' } },
        h('hr', {
          style: {
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.25)',
            margin: '12px 0'
          }
        }),
        h('strong', { style: { display: 'block', marginBottom: '10px' } }, 'Line Items:'),
        h(
          'ul',
          { className: 'orders', style: { gap: '8px', marginBottom: '6px' } },
          (order.line_items || []).map((item, idx) =>
            h(
              'li',
              {
                key: `${item.id || idx}-${item.sku || idx}`,
                className: 'order-row',
                style: { marginBottom: '6px' }
              },
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
  messagesEndRef,
  showAutomationButton,
  onCreateAutomation
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
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' } },
        h('h2', { style: { margin: 0 } }, title),
        showAutomationButton
          ? h(
              'button',
              {
                onClick: onCreateAutomation,
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
              'Create Automation'
            )
          : null
      ),
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

const AutomationModal = ({
  open,
  onClose,
  messages,
  onSendMessage,
  onInputChange,
  inputValue,
  submitting,
  messagesEndRef
}) => {
  if (!open) return null;
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
      h('h2', null, 'Create Automation'),
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
          placeholder: 'Describe the automation (criteria + actions)…',
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

const LogList = ({ entries, onSelect, onDelete }) =>
  h(
    'ul',
    { className: 'logs' },
    entries.map((entry, idx) =>
      h(
        'li',
        {
          key: idx,
          className: 'log-entry',
          onClick: () => onSelect && onSelect(entry),
          style: onSelect ? { cursor: 'pointer' } : undefined
        },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
          h('strong', null, entry.label || 'Saved query'),
          h(
            'span',
            { className: 'order-sub' },
            `${entry.time.toLocaleTimeString()} • ${entry.count} record${entry.count === 1 ? '' : 's'}`
          )
        ),
        onDelete && entry.id
          ? h(
              'button',
              {
                onClick: (e) => {
                  e.stopPropagation();
                  onDelete(entry.id);
                },
                style: {
                  marginLeft: 'auto',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer'
                }
              },
              'Remove'
            )
          : null
      )
    )
  );

const InsightsModal = ({
  open,
  onClose,
  messages,
  onSendMessage,
  inputValue,
  onInputChange,
  submitting,
  messagesEndRef,
  onDownloadCsv
}) => {
  if (!open) return null;
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
          width: 'min(700px, 90vw)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 18px 38px rgba(0,0,0,0.4)',
          position: 'relative',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column'
        },
        onClick: (e) => e.stopPropagation()
      },
      h(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('h3', null, 'ShopifAI Insights'),
        h(
          'button',
          {
            onClick: onClose,
            style: {
              background: '#000',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e8f4ec',
              border: '1px solid rgba(255,255,255,0.25)',
              cursor: 'pointer'
            }
          },
          '×'
        )
      ),
      h(
        'div',
        {
          style: {
            marginTop: '12px',
            padding: '12px',
            background: 'rgba(0,0,0,0.35)',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.15)',
            flex: '1 1 auto',
            overflowY: 'auto'
          }
        },
        messages.map((m, idx) =>
          h(
            'div',
            {
              key: idx,
              className: m.role === 'assistant' ? 'assistant-message' : 'user-message',
              style: { marginBottom: '10px' }
            },
            h(
              'p',
              { style: { margin: 0, whiteSpace: 'pre-wrap' } },
              m.text
            )
          )
        ),
        h('div', { ref: messagesEndRef })
      ),
      h(
        'div',
        { style: { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' } },
        onDownloadCsv
          ? h(
              'button',
              {
                onClick: onDownloadCsv,
                style: {
                  alignSelf: 'flex-start',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#e8f4ec',
                  cursor: 'pointer'
                }
              },
              'Download last CSV'
            )
          : null,
        h('textarea', {
          value: inputValue,
          onChange: (e) => onInputChange(e.target.value),
          placeholder: 'Ask for trends, a CSV export, or top performers for these orders…',
          style: {
            width: '100%',
            minHeight: '70px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            color: '#e8f4ec',
            padding: '10px'
          }
        }),
        h(
          'button',
          {
            onClick: onSendMessage,
            disabled: submitting,
            style: {
              alignSelf: 'flex-end',
              padding: '10px 14px',
              borderRadius: '6px',
              background: submitting ? 'rgba(255,255,255,0.3)' : '#000',
              color: '#fff',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              border: '1px solid rgba(255,255,255,0.25)'
            }
          },
          submitting ? 'Working…' : 'Send'
        )
      )
    )
  );
};

const OrdersList = ({ orders, loading, error, queried, onSelect, onShowAll }) => {
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
    return h(
      'div',
      null,
      h('p', { className: 'order-sub' }, 'No orders match your query.'),
      onShowAll
        ? h(
            'button',
            {
              style: {
                marginTop: '8px',
                padding: '8px 10px',
                borderRadius: '6px',
                background: '#000',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              },
              onClick: onShowAll
            },
            'Show all orders'
          )
        : null
    );
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

const CreatedOrdersCarousel = ({ orders, onSelect }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!orders || !orders.length) return null;
  const total = orders.length;
  const clampIndex = (idx) => ((idx % total) + total) % total;
  const goPrev = () => setActiveIndex((prev) => clampIndex(prev - 1));
  const goNext = () => setActiveIndex((prev) => clampIndex(prev + 1));
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  };

  const order = orders[clampIndex(activeIndex)];
  const card = h(
    'div',
    {
      key: order.id || activeIndex,
      className: 'order-row carousel-card',
      style: {
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '6px',
        padding: '14px',
        background: 'rgba(255,255,255,0.06)',
        cursor: onSelect ? 'pointer' : 'default',
        minWidth: '260px'
      },
      onClick: () => onSelect && onSelect(order)
    },
    h(
      'div',
      { className: 'order-meta' },
      h('p', { className: 'order-id' }, order.name || `Order #${order.id}`),
      h(
        'p',
        { className: 'order-sub' },
        `Total: ${order.total_price ? `$${order.total_price}` : '—'}`
      ),
      h(
        'p',
        { className: 'order-sub' },
        `Date: ${order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}`
      )
    )
  );

  return h(
    'div',
    {
      className: 'carousel-shell',
      tabIndex: 0,
      onKeyDown: handleKeyDown
    },
    [
      h(
        'button',
        {
          className: 'carousel-btn',
          onClick: goPrev,
          disabled: total <= 1,
          'aria-label': 'Previous created order'
        },
        '‹'
      ),
      h('div', { className: 'carousel-window' }, card),
      h(
        'button',
        {
          className: 'carousel-btn',
          onClick: goNext,
          disabled: total <= 1,
          'aria-label': 'Next created order'
        },
        '›'
      ),
      h(
        'div',
        { className: 'carousel-dots' },
        orders.map((_, idx) =>
          h('span', {
            key: `dot-${idx}`,
            className: `carousel-dot${idx === clampIndex(activeIndex) ? ' active' : ''}`,
            onClick: () => setActiveIndex(idx)
          })
        )
      )
    ]
  );
};

// Use UTC day boundaries for Shopify created_at filters to avoid timezone mismatches.
const getTimeZoneOffsetMinutes = (timeZone, date = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset'
    }).formatToParts(date);
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    const match = tzName.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/i);
    if (match) {
      const hours = Number(match[1]);
      const mins = match[2] ? Number(match[2]) : 0;
      return hours * 60 + (hours >= 0 ? mins : -mins);
    }
  } catch (err) {
    console.warn('[orders] failed to compute timezone offset for', timeZone, err);
  }
  return null;
};

const startOfDay = (date, timeZone) => {
  if (timeZone) {
    const offset = getTimeZoneOffsetMinutes(timeZone, date);
    if (offset !== null) {
      const utcMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      return new Date(utcMs - offset * 60 * 1000);
    }
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
};

const endOfDay = (date, timeZone) => {
  if (timeZone) {
    const offset = getTimeZoneOffsetMinutes(timeZone, date);
    if (offset !== null) {
      const utcMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
      return new Date(utcMs - offset * 60 * 1000);
    }
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
};

const AutomationModalDetail = ({ entry, onClose }) => {
  if (!entry) return null;
  const lines = entry.details ? entry.details.split('\n') : [];
  const scheduleLine = lines.find((l) => l.toLowerCase().startsWith('schedule:')) || '';
  const actionLine = lines.find((l) => l.toLowerCase().startsWith('action:')) || '';
  const orders = Array.isArray(entry.ordersSnapshot) ? entry.ordersSnapshot : [];
  const nextRunText = entry.next_run ? new Date(entry.next_run).toLocaleString() : 'Not scheduled';
  const lastRunText = entry.last_run ? new Date(entry.last_run).toLocaleString() : 'Never';
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
      scheduleLine ? h('h2', null, scheduleLine) : null,
      actionLine ? h('h2', null, actionLine) : null,
      h(
        'p',
        { className: 'order-sub' },
        `Last run: ${lastRunText} • ${entry.count} record${entry.count === 1 ? '' : 's'}`
      ),
      h('p', { className: 'order-sub' }, `Next run: ${nextRunText}`),
      !scheduleLine && !actionLine && entry.details
        ? h('p', { className: 'order-sub', style: { whiteSpace: 'pre-wrap' } }, entry.details)
        : null,
      orders.length
        ? h(
            'div',
            { style: { marginTop: '12px' } },
            h('h3', null, 'Orders updated in last run'),
            h(
              'ul',
              { className: 'orders' },
              orders.map((order, idx) =>
                h(
                  'li',
                  {
                    key: order.id || idx,
                    className: 'order-row'
                  },
                  h(
                    'div',
                    { className: 'order-meta' },
                    h('p', { className: 'order-id' }, order.name || `Order #${order.id}`),
                    h(
                      'p',
                      { className: 'order-sub' },
                      `Email: ${
                        order.email ||
                        (order.customer && order.customer.email) ||
                        'N/A'
                      } • ${order.financial_status || 'status unknown'}`
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
            )
          )
        : null
    )
  );
};

const levenshtein = (a, b) => {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
};

const fuzzyNormalizeQuery = (text) => {
  const vocab = [
    'yesterday',
    'today',
    'tomorrow',
    'last',
    'past',
    'week',
    'month',
    'year',
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];
  const parts = text.toLowerCase().split(/\b/);
  let warning = '';
  const normalized = parts
    .map((tok) => {
      if (!/[a-z]/.test(tok)) return tok;
      let best = tok;
      let bestDist = Infinity;
      for (const cand of vocab) {
        const d = levenshtein(tok, cand);
        if (d < bestDist) {
          bestDist = d;
          best = cand;
        }
      }
      if (bestDist > 0 && bestDist <= 2 && best !== tok) {
        warning = warning || `Interpreted "${tok}" as "${best}".`;
        return best;
      }
      return tok;
    })
    .join('');
  return { normalized, warning };
};

const deriveDateRangeFromQuery = (query, existingMin, existingMax, timeZone) => {
  let created_at_min = existingMin;
  let created_at_max = existingMax;
  const lc = (query || '').toLowerCase();
  const wantsAll =
    /\b(all orders?|everything|show me everything|no filter|no filters|any time|all time)\b/.test(
      lc
    );
  const hasDateCue =
    /\b(yesterday|today|last|past|week|month|year|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(
      lc
    ) ||
    /\b\d{4}-\d{2}-\d{2}\b/.test(lc) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/.test(lc);

  if (wantsAll) {
    created_at_min = undefined;
    created_at_max = undefined;
    return { created_at_min, created_at_max, warning: '' };
  }

  // If the caller explicitly supplied a range, keep it. Otherwise derive a range only when a date cue exists.
  if (created_at_min || created_at_max) {
    return { created_at_min, created_at_max, warning: '' };
  }
  if (!hasDateCue) {
    return { created_at_min, created_at_max, warning: '' };
  }

  const { normalized: lcQuery, warning } = fuzzyNormalizeQuery(query);
  const dayMs = 24 * 60 * 60 * 1000;
  let rangeStart = null;
  let rangeEnd = null;
  const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const explicitDateMatch =
    query.match(/\b\d{4}-\d{2}-\d{2}\b/) ||
    query.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i);
  const monthDayMatch = query.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:,?\s+(\d{4}))?/i
  );
  const monthOnlyMatch = query.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b(?:\s+(\d{4}))?/i
  );

  if (explicitDateMatch) {
    const parsed = Date.parse(explicitDateMatch[0]);
    if (!Number.isNaN(parsed)) {
      const parsedDate = new Date(parsed);
      rangeStart = startOfDay(parsedDate, timeZone);
      rangeEnd = endOfDay(parsedDate, timeZone);
    }
  } else if (monthDayMatch) {
    const monthToken = monthDayMatch[1].toLowerCase().slice(0, 3);
    const dayNum = Number(monthDayMatch[2]);
    const now = new Date();
    const effectiveYear = monthDayMatch[3] ? Number(monthDayMatch[3]) : now.getFullYear();
    const monthIndex =
      ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(
        monthToken === 'sep' && monthDayMatch[1].toLowerCase().startsWith('sept') ? 'sep' : monthToken
      );
    if (monthIndex !== -1 && !Number.isNaN(dayNum)) {
      const targetDate = new Date(Date.UTC(effectiveYear, monthIndex, dayNum));
      rangeStart = startOfDay(targetDate, timeZone);
      rangeEnd = endOfDay(targetDate, timeZone);
    }
  } else if (monthOnlyMatch) {
    const monthToken = monthOnlyMatch[1].toLowerCase().slice(0, 3);
    const monthIndex =
      ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(
        monthToken === 'sep' && monthOnlyMatch[1].toLowerCase().startsWith('sept') ? 'sep' : monthToken
      );
    const now = new Date();
    const effectiveYear = monthOnlyMatch[2] ? Number(monthOnlyMatch[2]) : now.getFullYear();
    if (monthIndex !== -1) {
      const start = new Date(Date.UTC(effectiveYear, monthIndex, 1, 0, 0, 0, 0));
      rangeStart = startOfDay(start, timeZone);
      const end = new Date(Date.UTC(effectiveYear, monthIndex + 1, 0, 0, 0, 0, 0));
      rangeEnd = endOfDay(end, timeZone);
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
      rangeStart = startOfDay(targetDate, timeZone);
      rangeEnd = endOfDay(targetDate, timeZone);
    }
  } else if (lcQuery.includes('last year')) {
    const now = new Date();
    rangeStart = startOfDay(new Date(Date.UTC(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0)), timeZone);
    rangeEnd = endOfDay(new Date(Date.UTC(now.getFullYear(), 0, 0, 0, 0, 0, 0)), timeZone);
  } else if (lcQuery.includes('past year')) {
    const now = new Date();
    rangeStart = startOfDay(new Date(now.getTime() - 365 * dayMs), timeZone);
    rangeEnd = endOfDay(now, timeZone);
  } else if (lcQuery.includes('last month')) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0, 0, 0, 0, 0));
    rangeStart = startOfDay(start, timeZone);
    rangeEnd = endOfDay(end, timeZone);
  } else if (
    lcQuery.includes('past month') ||
    /(past|last)\s+30\s+days/.test(lcQuery)
  ) {
    const now = new Date();
    rangeStart = startOfDay(new Date(now.getTime() - 30 * dayMs), timeZone);
    rangeEnd = endOfDay(now, timeZone);
  } else if (
    lcQuery.includes('last week') ||
    lcQuery.includes('past week') ||
    /(past|last)\s+7\s+days/.test(lcQuery)
  ) {
    const now = new Date();
    rangeStart = startOfDay(new Date(now.getTime() - 7 * dayMs), timeZone);
    rangeEnd = endOfDay(now, timeZone);
  } else if (lcQuery.includes('yesterday')) {
    const now = new Date();
    rangeStart = startOfDay(new Date(now.getTime() - dayMs), timeZone);
    rangeEnd = endOfDay(new Date(now.getTime() - dayMs), timeZone);
  } else if (lcQuery.includes('today')) {
    const now = new Date();
    rangeStart = startOfDay(now, timeZone);
    rangeEnd = endOfDay(now, timeZone);
  }

  return {
    created_at_min: rangeStart ? rangeStart.toISOString() : created_at_min,
    created_at_max: rangeEnd ? rangeEnd.toISOString() : created_at_max,
    warning
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
  const [editCommitted, setEditCommitted] = useState(false);
  const [lastEditDescription, setLastEditDescription] = useState('');
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [automationMessages, setAutomationMessages] = useState([
    {
      role: 'assistant',
      text:
        'Tell me how often you want to run this recurring automation. ShopifAI will combine your search query with the edit operation you just performed and run it on the schedule you define here.'
    }
  ]);
  const [automationInput, setAutomationInput] = useState('');
  const [automationProcessing, setAutomationProcessing] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState(null);
  const [shopState, setShopState] = useState({ shops: [], active: '', status: 'Checking…' });
  const [clientCredStatus, setClientCredStatus] = useState('Not set');
  const [shopDomainInput, setShopDomainInput] = useState('');
  const [shopTokenInput, setShopTokenInput] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState('');
  const [insightModalOpen, setInsightModalOpen] = useState(false);
  const [insightMessages, setInsightMessages] = useState([]);
  const [insightInput, setInsightInput] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const editMessagesEndRef = useRef(null);
  const automationMessagesEndRef = useRef(null);
  const insightMessagesEndRef = useRef(null);
  const [shopTimeZone, setShopTimeZone] = useState(null);

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
    if (automationMessagesEndRef.current) {
      automationMessagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [automationMessages, showAutomationModal]);

  useEffect(() => {
    if (insightMessagesEndRef.current) {
      insightMessagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [insightMessages, insightModalOpen]);

  useEffect(() => {
    setStatus('Ready');
  }, []);

  useEffect(() => {
    const loadShopInfo = async () => {
      if (!window.electronAPI?.mcpGetShopInfo) return;
      try {
        const res = await window.electronAPI.mcpGetShopInfo();
        if (res?.ok && res.shop) {
          const tz = res.shop.iana_timezone || res.shop.timezone || res.shop.time_zone || null;
          if (tz) {
            setShopTimeZone(tz);
            console.log('[orders] shop timezone set to', tz);
          }
        }
      } catch (err) {
        console.error('[orders] failed to load shop info', err);
      }
    };
    loadShopInfo();
  }, []);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const shops = (await window.electronAPI.oauthList()) || [];
        const activeInfo = (await window.electronAPI.oauthGetActive()) || {};
        const creds = (await window.electronAPI.oauthGetClientCreds()) || {};
        setShopState({
          shops,
          active: activeInfo.shop || '',
          status: activeInfo.shop ? `Connected: ${activeInfo.shop}` : 'Not connected'
        });
        setClientCredStatus(
          creds.clientId && creds.clientSecret ? 'Client credentials set' : 'Client credentials not set'
        );
      } catch (error) {
        setShopState((prev) => ({ ...prev, status: 'Auth error' }));
        console.error('OAuth load error', error);
      }
    };
    loadAuth();
  }, []);

  useEffect(() => {
    const loadAutomations = async () => {
      if (!window.electronAPI?.automationsList) return;
      try {
        const items = (await window.electronAPI.automationsList()) || [];
        setLogs(
          items.map((row) => ({
            id: row.id,
            time: new Date(row.created_at || Date.now()),
            count: row.orders_snapshot ? (Array.isArray(row.orders_snapshot) ? row.orders_snapshot.length : 0) : 0,
            label: row.label || 'Automation',
            details: `Schedule: ${row.schedule || ''}\nAction: ${row.action || ''}`,
            ordersSnapshot: row.orders_snapshot || [],
            next_run: row.next_run || null,
            last_run: row.last_run || null
          }))
        );
      } catch (error) {
        console.error('Failed to load automations', error);
      }
    };
    loadAutomations();
  }, []);

  useEffect(() => {
    const loadCachedOrders = async () => {
      if (!window.electronAPI?.ordersCacheList) return;
      try {
        const rows = (await window.electronAPI.ordersCacheList(1)) || [];
        const latest = rows[0];
        if (latest && Array.isArray(latest.orders) && latest.orders.length) {
          setOrders(latest.orders);
          setHasQueriedOrders(true);
        }
      } catch (error) {
        console.error('[orders] Failed to load cached orders', error);
      }
    };
    loadCachedOrders();
  }, []);

  useEffect(() => {
    const loadCreatedOrders = async () => {
      if (!window.electronAPI?.ordersCreatedList) return;
      try {
        const rows = (await window.electronAPI.ordersCreatedList(1)) || [];
        const latest = rows[0];
        if (latest && Array.isArray(latest.orders) && latest.orders.length) {
          setCreatedOrders(latest.orders);
        }
      } catch (error) {
        console.error('[orders] Failed to load created orders cache', error);
      }
    };
    loadCreatedOrders();
  }, []);

  const addLog = async ({ count, label, details, ordersSnapshot }) => {
    const payload = {
      label: label || 'Automation',
      schedule: details?.split('\n').find((l) => l.toLowerCase().startsWith('schedule:')) || '',
      action: details?.split('\n').find((l) => l.toLowerCase().startsWith('action:')) || '',
      search_query: lastQueryLabel || '',
      orders_snapshot: ordersSnapshot || []
    };

    let entry = null;
    if (window.electronAPI?.automationsSave) {
      try {
        const saved = await window.electronAPI.automationsSave(payload);
        if (saved && saved.id) {
          entry = {
            id: saved.id,
            time: new Date(saved.created_at || Date.now()),
            count:
              saved.orders_snapshot && Array.isArray(saved.orders_snapshot)
                ? saved.orders_snapshot.length
                : count,
            label: saved.label || payload.label || 'Automation',
            details: details || `Schedule: ${payload.schedule}\nAction: ${payload.action}`,
            ordersSnapshot: saved.orders_snapshot || payload.orders_snapshot || []
          };
        }
      } catch (error) {
        console.error('Failed to persist automation', error);
      }
    }

    if (!entry) {
      entry = {
        id: Date.now(),
        time: new Date(),
        count,
        label: label || 'Saved query',
        details,
        ordersSnapshot: ordersSnapshot || []
      };
    }

    setLogs((prev) => [...prev, entry]);
  };

  const endOfMonth = (date) => {
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return end;
  };

  const parseAutomationSchedule = (text) => {
    const lower = text.toLowerCase();
    const now = new Date();
    let intervalDays = 1;
    const dayMatch = lower.match(/every\s+(\d+)\s*day/);
    if (dayMatch && Number(dayMatch[1])) {
      intervalDays = Math.max(1, Number(dayMatch[1]));
    } else if (/\bevery day\b/.test(lower) || /\bdaily\b/.test(lower)) {
      intervalDays = 1;
    } else if (lower.includes('week')) {
      intervalDays = 7;
    } else if (lower.includes('month')) {
      intervalDays = 30;
    }
    const nextRun = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    let endAt = null;
    const nextDays = lower.match(/next\s+(\d+)\s+day/);
    if (nextDays && Number(nextDays[1])) {
      endAt = new Date(now.getTime() + Number(nextDays[1]) * 24 * 60 * 60 * 1000);
    }
    const untilDateIso = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (untilDateIso) {
      const parsed = Date.parse(untilDateIso[1]);
      if (!Number.isNaN(parsed)) {
        endAt = new Date(parsed);
        endAt.setHours(23, 59, 59, 999);
      }
    } else if (/end of the month/.test(lower) || /until.+month/.test(lower)) {
      endAt = endOfMonth(now);
    }

    return {
      intervalDays,
      startAt: now,
      nextRun,
      endAt
    };
  };

  const parseAutomationTags = (actionText) => {
    if (!actionText) return [];
    const lower = actionText.toLowerCase();
    const tags = [];
    const quoted = [...actionText.matchAll(/"([^"]+)"|'([^']+)'/g)].map((m) => (m[1] || m[2] || '').trim());
    quoted.forEach((t) => t && tags.push(t));
    if (tags.length) return tags;
    const addMatch = lower.match(/add\s+([a-z0-9_,\s-]+)/i);
    if (addMatch && addMatch[1]) {
      addMatch[1]
        .split(/[, ]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => tags.push(t));
    }
    return tags;
  };

  const requireShopConnection = () => {
    if (!shopState.active) {
      setOrdersError('Please connect your Shopify shop before searching or creating orders.');
      setStatus('Not connected');
      return false;
    }
    return true;
  };

  const handleConnectShopify = async () => {
    if (!window.electronAPI?.oauthSetToken) {
      alert('Shopify connection is not available in this build. Please restart after installing dependencies.');
      return;
    }
    const shop = (shopDomainInput || '').trim();
    const token = (shopTokenInput || '').trim();
    if (!shop || !token) {
      alert('Please enter both shop domain and Admin API access token.');
      return;
    }
    try {
      setStatus('Connecting to Shopify…');
      await window.electronAPI.oauthSetToken(shop, token);
      await window.electronAPI.oauthSetActive(shop);
      const shops = (await window.electronAPI.oauthList()) || [];
      const activeInfo = (await window.electronAPI.oauthGetActive()) || {};
      setShopState({
        shops,
        active: activeInfo.shop || '',
        status: activeInfo.shop ? `Connected: ${activeInfo.shop}` : 'Not connected'
      });
      setShopDomainInput('');
      setShopTokenInput('');
      setShowConnectModal(false);
      setStatus('Ready');
      alert('Shop connected. If needed, restart the MCP connection by running a search.');
    } catch (error) {
      console.error('Shopify connect error', error);
      setStatus('Error');
      alert(error?.message || 'Failed to connect to Shopify.');
    }
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
    const targetOrders = editTargets.length ? editTargets : orders;
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
        setEditCommitted(true);
        setLastEditDescription(`Add tags: ${tagString}`);
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

  const handleAutomationSendMessage = (text) => {
    if (!text || !text.trim()) return;
    const trimmed = text.trim();
    setAutomationMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setAutomationProcessing(true);
    const { intervalDays, startAt, nextRun, endAt } = parseAutomationSchedule(trimmed);
    const searchLabel = lastQueryLabel || 'Last search';
    const editLabel = lastEditDescription || 'Edit action';
    const label = `${searchLabel} • ${editLabel}`;
    const scheduleString = `every ${intervalDays} day(s)${
      endAt ? ` until ${endAt.toISOString().slice(0, 10)}` : ''
    }`;
    const detailText = `Schedule: ${scheduleString}\nSearch: ${searchLabel}\nAction: ${editLabel}`;

    const automationPayload = {
      label,
      schedule: scheduleString,
      action: editLabel,
      search_query: searchLabel,
      orders_snapshot: editTargets.length ? editTargets : orders,
      last_run: startAt.toISOString(),
      next_run: nextRun.toISOString(),
      start_at: startAt.toISOString(),
      end_at: endAt ? endAt.toISOString() : null,
      enabled: true,
      interval_days: intervalDays
    };

    const successMessage = `Got it. I saved this automation: ${scheduleString}. Next run: ${nextRun.toLocaleString()}.`;

    const finish = () => {
      setAutomationMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: successMessage
        }
      ]);
      setAutomationProcessing(false);
      setAutomationInput('');
    };

    if (window.electronAPI?.automationsSave) {
      window.electronAPI
        .automationsSave(automationPayload)
        .then(() => finish())
        .catch((error) => {
          console.error('Failed to persist automation', error);
          setAutomationMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: `I tried to save the automation but hit an error: ${error?.message || 'unknown error'}.`
            }
          ]);
          setAutomationProcessing(false);
          setAutomationInput('');
        });
    } else {
      finish();
    }

    setLogs((prev) => [
      ...prev,
      {
        time: new Date(),
        count: automationPayload.orders_snapshot ? automationPayload.orders_snapshot.length : 0,
        label,
        details: detailText,
        ordersSnapshot: automationPayload.orders_snapshot || [],
        next_run: automationPayload.next_run,
        last_run: automationPayload.last_run
      }
    ]);
  };

  // Background automation runner (triggered from main via IPC)
  useEffect(() => {
    if (!window.electronAPI?.onAutomationRun) return undefined;
    const unsubscribe = window.electronAPI.onAutomationRun(async (auto) => {
      try {
        console.log('[automation] received automation to run:', auto);
        let workingOrders = Array.isArray(auto.orders_snapshot) ? auto.orders_snapshot : [];
        if (auto.search_query && window.electronAPI?.openaiChatWithFunctions && window.electronAPI?.mcpListOrders) {
      try {
        const { params } = await callOpenAIListOrders(auto.search_query);
        const payload = { ...params };
        if (!payload.status) payload.status = 'any';
        const result = await window.electronAPI.mcpListOrders(payload);
        if (result?.ok && Array.isArray(result.orders)) {
          workingOrders = result.orders;
        }
      } catch (err) {
        console.error('[automation] search step failed, falling back to snapshot:', err);
          }
        }

        const tags = parseAutomationTags(auto.action);
        if (tags.length && window.electronAPI?.mcpUpdateOrder) {
          const tagString = tags.join(', ');
          for (const order of workingOrders) {
            try {
              await window.electronAPI.mcpUpdateOrder({ order_id: order.id, tags: tagString });
            } catch (err) {
              console.error('[automation] failed to update order', order?.id, err);
            }
          }
          console.log('[automation] applied tags to', workingOrders.length, 'orders');
        }
      } catch (err) {
        console.error('[automation] run failed:', err);
      }
    });
    return unsubscribe;
  }, []);

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

  const openaiListOrdersFunction = [
    {
      name: 'list_orders',
      description: 'Fetch Shopify orders matching filters',
      parameters: {
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
        }
      }
    },
    {
      name: 'search_products',
      description: 'Search for products by title to find matching SKUs/variants',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
        },
        required: ['query']
      }
    }
  ];

  const callOpenAIListOrders = async (queryText) => {
    if (!window.electronAPI?.openaiChatWithFunctions) {
      throw new Error('OpenAI function-calling helper is not available.');
    }
    const trimmed = (queryText || '').trim();
    const hasDateCue =
      /\b(yesterday|today|last|past|week|month|year|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(
        trimmed
      ) ||
      /\b\d{4}-\d{2}-\d{2}\b/.test(trimmed) ||
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(trimmed);
    const wantsAll =
      /\b(all orders?|everything|show me everything|no filter|no filters|any time|all time)\b/i.test(
        trimmed
      );
    const messages = [
      {
        role: 'system',
        content:
          'Map Shopify order requests to the list_orders function. Use a sensible limit (default 5) unless the user asks for a different count. ' +
          'If no order status is specified, use status=any. If the user provides payment/fulfillment states, pass them through. ' +
          'If the user mentions a timeframe, provide created_at_min/max in ISO8601. If the user mentions email, order id/number/name, or customer name, include them. ' +
          'Only set sku when the user explicitly provides a SKU/variant/product code (or says "SKU"/"variant"/"product code"); do not treat generic product names as SKUs. ' +
          'If the user gives a product name (e.g., "snowboards", "boots"), call search_products to find matching variants/SKUs, then use those SKUs to filter orders via list_orders. ' +
          'If the user asks for all orders, do not add date filters. Do not change filters unless the user requests it. ' +
          'Do not invent IDs or emails.'
      },
      { role: 'user', content: trimmed || 'Find recent orders' }
    ];

    const response = await window.electronAPI.openaiChatWithFunctions({
      messages,
      functions: openaiListOrdersFunction,
      model: 'gpt-4o-mini',
      temperature: 0
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'OpenAI function call failed');
    }
    if (!response.called || !response.called.args) {
      throw new Error('OpenAI did not return function arguments');
    }
    if (response.called.name === 'search_products') {
      // Prefer direct search results; otherwise fall back to list_products and filter locally.
      let products = (response.called.result && response.called.result.products) || [];

      if ((!products || products.length === 0) && window.electronAPI?.mcpListProducts) {
        const listResult = await window.electronAPI.mcpListProducts({ limit: 100 });
        if (listResult?.ok && Array.isArray(listResult.products)) {
          const expandTerms = (tokens) => {
            const variants = new Set();
            tokens.forEach((t) => {
              const term = t.toLowerCase();
              variants.add(term);
              if (term.endsWith('ies')) variants.add(term.slice(0, -3) + 'y');
              if (term.endsWith('es')) variants.add(term.slice(0, -2));
              if (term.endsWith('s')) variants.add(term.slice(0, -1));
              if (!term.endsWith('s') && term.length > 2) variants.add(`${term}s`);
            });
            return Array.from(variants).filter((v) => v.length >= 3);
          };

          const terms = expandTerms(
            (trimmed || '').split(/\s+/).filter((t) => t.trim().length >= 3)
          );
          products = listResult.products.filter((p) => {
            const title = (p.title || p.handle || '').toLowerCase();
            const productType = (p.product_type || '').toLowerCase();
            const variantTitles = (p.variants || []).map((v) => (v.title || '').toLowerCase());
            return terms.some(
              (t) =>
                title.includes(t) ||
                productType.includes(t) ||
                variantTitles.some((vt) => vt.includes(t))
            );
          });
        }
      }

      const firstProduct = Array.isArray(products) ? products[0] : null;
      const firstVariant =
        firstProduct && Array.isArray(firstProduct.variants) && firstProduct.variants.length
          ? firstProduct.variants[0]
          : null;
      const sku = firstVariant?.sku || firstProduct?.sku || null;
      if (!sku) {
        throw new Error('No matching products found for that query.');
      }
      return { params: { sku, status: 'any', limit: 50 }, meta: { hasDateCue, wantsAll } };
    }
    const args = { ...response.called.args };
    if (wantsAll) {
      delete args.created_at_min;
      delete args.created_at_max;
      args.limit = args.limit || 250;
    }
    if (!args.status) args.status = 'any';
    if (args.limit === undefined || args.limit === null) {
      args.limit = hasDateCue ? 100 : 150;
    }
    return { params: args, meta: { hasDateCue, wantsAll } };
  };

  const openaiDraftFunctions = [
    {
      name: 'draft_order_intent',
      description: 'Plan the next draft order action and capture structured state',
      parameters: {
        type: 'object',
        properties: {
          reply: { type: 'string' },
          action: { type: 'string', enum: ['none', 'search', 'update_draft', 'submit'] },
          search_query: { type: 'string', nullable: true },
          line_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sku: { type: 'string', nullable: true },
                variant_id: { type: 'integer', nullable: true },
                quantity: { type: 'integer', nullable: true }
              }
            }
          },
          shipping_address: {
            type: 'object',
            nullable: true,
            properties: {
              name: { type: 'string', nullable: true },
              address1: { type: 'string', nullable: true },
              address2: { type: 'string', nullable: true },
              city: { type: 'string', nullable: true },
              province: { type: 'string', nullable: true },
              zip: { type: 'string', nullable: true },
              country: { type: 'string', nullable: true },
              phone: { type: 'string', nullable: true }
            }
          },
          billing_address: {
            type: 'object',
            nullable: true,
            properties: {
              name: { type: 'string', nullable: true },
              address1: { type: 'string', nullable: true },
              address2: { type: 'string', nullable: true },
              city: { type: 'string', nullable: true },
              province: { type: 'string', nullable: true },
              zip: { type: 'string', nullable: true },
              country: { type: 'string', nullable: true },
              phone: { type: 'string', nullable: true }
            }
          },
          email: { type: 'string', nullable: true },
          note: { type: 'string', nullable: true },
          confirm_submit: { type: 'boolean', nullable: true }
        },
        required: ['reply', 'action'],
        additionalProperties: false
      }
    }
  ];

  const handleFetchOrders = async (queryParams = {}) => {
    if (!requireShopConnection()) return;
    setOrdersLoading(true);
    setOrdersError('');
    setStatus('Fetching orders…');
    setSelectedOrder(null);
    setAiAnalysis('');
    setAiAnalysisError('');
    setAiAnalysisLoading(false);

    try {
      if (!window.electronAPI?.mcpListOrders) {
        throw new Error('MCP client is not available');
      }

      const requestPayload = { ...queryParams };
      let filterParams = { ...requestPayload };

      console.log('[orders] list_orders payload:', JSON.stringify(requestPayload, null, 2));
      const result = await window.electronAPI.mcpListOrders(requestPayload);
      if (!result?.ok) {
        throw new Error(result?.error || 'MCP call failed');
      }

      const hadDateFilter = !!(requestPayload.created_at_min || requestPayload.created_at_max);
      let widenedNotice = '';
      const rawLoaded = result.orders || [];
      let loaded = rawLoaded;
      console.log('[orders] list_orders result count:', Array.isArray(loaded) ? loaded.length : 0);
      if (Array.isArray(loaded)) {
        loaded.forEach((order, idx) => {
          console.log(`[orders] result[${idx}]:`, JSON.stringify(order, null, 2));
        });
      }

      // No auto-widening; keep the model/user filters intact. If zero, show zero.

      console.log('[orders] final count after client filters:', Array.isArray(loaded) ? loaded.length : 0);

      setOrders(loaded);
      setSelectedOrder(null);
      if (hadDateFilter && Array.isArray(loaded) && loaded.length === 0) {
        setStatus('No results');
        setOrdersError('No orders found for that date range.');
      } else {
        setStatus('Ready');
        setOrdersError('');
      }
      // Persist the latest search results so refreshes show the newest data.
      if (window.electronAPI?.ordersCacheSave) {
        const label =
          (typeof lastQueryLabel === 'string' && lastQueryLabel.trim()) ||
          (typeof nlQuery === 'string' && nlQuery.trim()) ||
          'Latest orders';
        await window.electronAPI.ordersCacheSave({
          label,
          search_query: requestPayload?.search_query || nlQuery || '',
          orders: Array.isArray(loaded) ? loaded : []
        });
      }

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

  const handleDeleteAutomation = async (id) => {
    if (!id) return;
    // Optimistically drop from local list for responsiveness.
    setLogs((prev) => prev.filter((entry) => entry.id !== id));
    if (selectedAutomation && selectedAutomation.id === id) {
      setSelectedAutomation(null);
    }
    try {
      if (window.electronAPI?.automationsDelete) {
        const res = await window.electronAPI.automationsDelete(Number(id));
        if (!res || res.deleted === 0) {
          console.warn('[automations] Delete returned zero changes for id', id);
        }
      }
      if (window.electronAPI?.automationsList) {
        const items = (await window.electronAPI.automationsList()) || [];
        setLogs(
          items.map((row) => ({
            id: row.id,
            time: new Date(row.created_at || Date.now()),
            count: row.orders_snapshot
              ? Array.isArray(row.orders_snapshot)
                ? row.orders_snapshot.length
                : 0
              : 0,
            label: row.label || 'Automation',
            details: `Schedule: ${row.schedule || ''}\nAction: ${row.action || ''}`,
            ordersSnapshot: row.orders_snapshot || [],
            next_run: row.next_run || null,
            last_run: row.last_run || null
          }))
        );
      }
    } catch (error) {
      console.error('[automations] Failed to delete automation', error);
      // Re-sync list if the delete failed
      if (window.electronAPI?.automationsList) {
        try {
          const items = (await window.electronAPI.automationsList()) || [];
          setLogs(
            items.map((row) => ({
              id: row.id,
              time: new Date(row.created_at || Date.now()),
              count: row.orders_snapshot
                ? Array.isArray(row.orders_snapshot)
                  ? row.orders_snapshot.length
                  : 0
                : 0,
              label: row.label || 'Automation',
              details: `Schedule: ${row.schedule || ''}\nAction: ${row.action || ''}`,
              ordersSnapshot: row.orders_snapshot || [],
              next_run: row.next_run || null,
              last_run: row.last_run || null
            }))
          );
        } catch (err) {
          console.error('[automations] Failed to refresh after delete failure', err);
        }
      }
    }
  };

  const handleShowAllOrders = async () => {
    await handleFetchOrders({ status: 'any', limit: 250 });
    setLastQueryLabel('All orders');
  };

  const handleAnalyzeOrders = async () => {
    if (!Array.isArray(orders) || !orders.length) {
      setAiAnalysisError('Run a search first, then analyze.');
      setAiAnalysis('');
      return;
    }
    if (!window.electronAPI?.codexAnalyzeOrders) {
      setAiAnalysisError('Codex analysis is not available in this build.');
      return;
    }
    const userPrompt = lastQueryLabel || nlQuery || 'Order search';
    setAiAnalysisLoading(true);
    setAiAnalysisError('');
    try {
      const limited = orders.slice(0, 25).map((o) => ({
        id: o.id,
        name: o.name,
        total_price: o.total_price,
        currency: o.currency,
        created_at: o.created_at,
        tags: o.tags,
        financial_status: o.financial_status,
        fulfillment_status: o.fulfillment_status,
        line_items: Array.isArray(o.line_items)
          ? o.line_items.map((li) => ({
              title: li.title,
              variant_title: li.variant_title,
              sku: li.sku,
              quantity: li.quantity
            }))
          : []
      }));
      const promptText = `${userPrompt}\n\nPlease respond with a concise, conversational summary (2-4 sentences) of notable patterns or anomalies. Avoid bullet points; use plain English.`;
      console.log('[ai-search] sending to Codex (redacted):', JSON.stringify(limited, null, 2));
      const res = await window.electronAPI.codexAnalyzeOrders(promptText, limited);
      if (res?.ok) {
        console.log('[ai-search] Codex analysis response:', res.analysis);
        const cleanAnalysisText = (text) => {
          if (!text) return '';
          if (typeof text === 'string') {
            const trimmed = text.trim();
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed && typeof parsed.analysis === 'string') {
                return parsed.analysis;
              }
            } catch (e) {
              // not JSON, proceed
            }
            if (
              (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
              (trimmed.startsWith("'") && trimmed.endsWith("'"))
            ) {
              return trimmed.slice(1, -1);
            }
            return trimmed;
          }
          if (text && typeof text.analysis === 'string') {
            return text.analysis;
          }
          return String(text);
        };
        const sanitized = cleanAnalysisText(res.analysis);
        setAiAnalysis(sanitized);
        setAiAnalysisError('');
      } else {
        console.error('[ai-search] Codex analysis error:', res);
        setAiAnalysis('');
        setAiAnalysisError(res?.error || 'AI analysis failed');
      }
    } catch (err) {
      console.error('[orders] AI analysis failed:', err);
      setAiAnalysis('');
      setAiAnalysisError(err?.message || 'AI analysis failed');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const redactedOrdersForInsights = (sourceOrders = orders, limit = 50) =>
    (sourceOrders || []).slice(0, limit).map((o) => ({
      id: o.id,
      name: o.name,
      total_price: o.total_price,
      currency: o.currency,
      created_at: o.created_at,
      tags: o.tags,
      financial_status: o.financial_status,
      fulfillment_status: o.fulfillment_status,
      line_items: (o.line_items || []).map((li) => ({
        title: li.title,
        variant_title: li.variant_title,
        sku: li.sku,
        quantity: li.quantity
      }))
    }));

  const buildLocalCsv = (sourceOrders = []) => {
    const rows = [
      'id,name,total_price,currency,financial_status,fulfillment_status,created_at,tag_list,item_title,item_sku,item_qty'
    ];
    sourceOrders.forEach((o) => {
      const tags = String(o.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .join('|');
      const lineItems = (o.line_items || []).length ? o.line_items : [{ title: '', sku: '', quantity: '' }];
      lineItems.forEach((li) => {
        const cells = [
          o.id ?? '',
          (o.name || '').replace(/,/g, ''),
          o.total_price ?? '',
          o.currency ?? '',
          o.financial_status ?? '',
          o.fulfillment_status ?? '',
          o.created_at ?? '',
          tags.replace(/,/g, '|'),
          (li.title || '').replace(/,/g, ''),
          li.sku ?? '',
          li.quantity ?? ''
        ];
        rows.push(cells.join(','));
      });
    });
    return rows.join('\n');
  };

  const localTrendSummary = (payloadOrders = []) => {
    if (!payloadOrders.length) return '';
    const total = payloadOrders.length;
    const revenue = payloadOrders.reduce(
      (acc, o) => acc + (parseFloat(o.total_price) || 0),
      0
    );
    const avg = total ? revenue / total : 0;
    const tagCounts = {};
    const itemCounts = {};
    payloadOrders.forEach((o) => {
      const tags = String(o.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      tags.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
      (o.line_items || []).forEach((li) => {
        const key = li.title || li.sku;
        if (!key) return;
        itemCounts[key] = (itemCounts[key] || 0) + (Number(li.quantity) || 1);
      });
    });
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];
    const topItem = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0];
    return [
      `Orders analyzed: ${total}`,
      `GMV: $${revenue.toFixed(2)}`,
      `Avg order: $${avg.toFixed(2)}`,
      `Top tag: ${topTag ? `${topTag[0]} (${topTag[1]})` : 'n/a'}`,
      `Top item: ${topItem ? `${topItem[0]} (${topItem[1]})` : 'n/a'}`
    ].join(' • ');
  };

  const detectInsightMode = (text) => {
    const lc = (text || '').toLowerCase();
    if (lc.includes('csv') || lc.includes('export')) return 'csv';
    if (lc.includes('top') || lc.includes('best') || lc.includes('highest')) return 'top';
    return 'trends';
  };

  const applyCsvIntent = (promptText, sourceOrders = []) => {
    const lc = (promptText || '').toLowerCase();
    let limit = null;
    const limitMatch = lc.match(/(?:only|first|top)\s+(\d+)/);
    if (limitMatch) {
      limit = Number(limitMatch[1]) || null;
    }
    let sortKey = null;
    let sortDir = 'desc';
    if (lc.includes('created_at') || lc.includes('date')) {
      sortKey = 'created_at';
      if (lc.includes('asc') || lc.includes('oldest') || lc.includes('earliest')) {
        sortDir = 'asc';
      }
    } else if (lc.includes('price') || lc.includes('total')) {
      sortKey = 'total_price';
      if (lc.includes('cheapest') || lc.includes('lowest') || lc.includes('asc')) {
        sortDir = 'asc';
      } else {
        sortDir = 'desc';
      }
    } else if (lc.includes('expensive')) {
      sortKey = 'total_price';
      sortDir = 'desc';
    }

    let working = [...(sourceOrders || [])];
    if (sortKey === 'created_at') {
      working = working
        .filter((o) => o.created_at)
        .sort((a, b) => {
          const da = new Date(a.created_at).getTime();
          const db = new Date(b.created_at).getTime();
          return sortDir === 'asc' ? da - db : db - da;
        });
    } else if (sortKey === 'total_price') {
      working = working
        .filter((o) => o.total_price !== undefined && o.total_price !== null)
        .sort((a, b) => {
          const pa = parseFloat(a.total_price) || 0;
          const pb = parseFloat(b.total_price) || 0;
          return sortDir === 'asc' ? pa - pb : pb - pa;
        });
    }

    if (limit && limit > 0) {
      working = working.slice(0, limit);
    }
    return working;
  };

  const fetchCachedOrdersForInsights = async () => {
    if (!window.electronAPI?.ordersCacheList) return [];
    try {
      const rows = (await window.electronAPI.ordersCacheList(1)) || [];
      const latest = rows[0];
      const cached = Array.isArray(latest?.orders) ? latest.orders : [];
      if (cached.length) {
        setOrders(cached);
        setHasQueriedOrders(true);
      }
      return cached;
    } catch (err) {
      console.error('[insights] Failed to load cached orders for insights', err);
      return [];
    }
  };

  const [lastCsv, setLastCsv] = useState('');

  const handleSendInsightMessage = async () => {
    const trimmed = (insightInput || '').trim();
    if (!trimmed) return;
    setInsightMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInsightInput('');
    setInsightLoading(true);
    try {
      if (!window.electronAPI?.codexReport) {
        throw new Error('Codex reporting is not available in this build.');
      }
      let payloadOrders = Array.isArray(orders) ? orders : [];
      if (!payloadOrders.length) {
        payloadOrders = await fetchCachedOrdersForInsights();
      }
      if (!payloadOrders.length) {
        setInsightMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Run a search first so I have orders to analyze.' }
        ]);
        return;
      }
      const mode = detectInsightMode(trimmed);
      const maybeFilteredForCsv = mode === 'csv' ? applyCsvIntent(trimmed, payloadOrders) : payloadOrders;
      const redacted = redactedOrdersForInsights(maybeFilteredForCsv, 50);
      const res = await window.electronAPI.codexReport(trimmed, redacted, mode);
      if (!res?.ok) {
        throw new Error(res?.error || 'Codex report failed');
      }
      let reply = '';
      if (mode === 'csv') {
        reply = res.data?.csv || '';
        if (!reply || !reply.trim()) {
          reply = buildLocalCsv(redacted) || 'No CSV returned.';
        }
        if (reply && reply.trim()) {
          setLastCsv(reply);
        }
      } else if (mode === 'top') {
        const top = res.data?.top || [];
        reply =
          top.length === 0
            ? 'No top orders found.'
            : top
                .map(
                  (t, idx) =>
                    `${idx + 1}. ${t.name || 'Order'} — ${t.total_price || 'N/A'} ${t.currency || ''} (${t.line_item_count || 0} items)`
                )
                .join('\n');
      } else {
        reply = res.data?.analysis || '';
        if (!reply || !reply.trim()) {
          reply =
            localTrendSummary(redacted) || 'No data returned from Codex. Try re-running your search first.';
        }
      }
      setInsightMessages((prev) => [...prev, { role: 'assistant', text: reply || 'No data returned.' }]);
    } catch (error) {
      setInsightMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Sorry, I hit an error: ${error?.message || 'Unknown error'}` }
      ]);
    } finally {
      setInsightLoading(false);
      if (insightMessagesEndRef.current) {
        insightMessagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  };

  const handleCreateOrder = async (draftOverride) => {
    if (!requireShopConnection()) return;
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
        setCreatedOrders((prev) => {
          const next = [result.order, ...prev];
          // Persist latest created orders snapshot
          if (window.electronAPI?.ordersCreatedSave) {
            window.electronAPI.ordersCreatedSave({
              label: 'Recently created',
              orders: next
            }).catch((err) => console.error('[orders] persist created orders failed:', err));
          }
          return next;
        });
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

  const renderAiAnalysisContent = () => {
    if (!aiAnalysis) return null;
    const lines = aiAnalysis
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const allBullets = lines.every((l) => l.startsWith('- '));

    const containerStyle = {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '12px',
      color: '#fff',
      fontSize: '13px',
      lineHeight: '1.6'
    };

    if (allBullets) {
      return h(
        'div',
        { style: containerStyle },
        h(
          'ul',
          { style: { paddingLeft: '18px', margin: 0 } },
          lines.map((l, idx) =>
            h('li', { key: `ai-line-${idx}` }, l.replace(/^- /, '').trim())
          )
        )
      );
    }

    return h('div', { style: { ...containerStyle, whiteSpace: 'pre-wrap' } }, aiAnalysis);
  };

  const handleProductSearch = async (overrideQuery) => {
    if (!requireShopConnection()) return;
    if (!window.electronAPI?.mcpSearchProducts) {
      setProductError('Product search tool is not available.');
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Product search tool is not available right now.' }
      ]);
      return;
    }
    const queryValue = overrideQuery !== undefined ? overrideQuery : productQuery;
    const broadQuery = /^(all products?|all items?|products?)$/i;
    let cleanedQuery = (queryValue || '').trim();
    if (broadQuery.test(cleanedQuery)) {
      cleanedQuery = '';
    }
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

        if (window.electronAPI?.mcpListProducts && (products.length === 0 || !cleanedQuery)) {
          const listResult = await window.electronAPI.mcpListProducts({ limit: 50 });
          if (listResult?.ok && Array.isArray(listResult.products)) {
            products = listResult.products;
            if (cleanedQuery) {
              const terms = cleanedQuery
                .toLowerCase()
                .split(/\s+/)
                .filter((t) => t.length >= 3);
              products = products.filter((p) => {
                const title = (p.title || p.handle || '').toLowerCase();
                const productType = (p.product_type || '').toLowerCase();
                const variantTitles = (p.variants || []).map((v) => (v.title || '').toLowerCase());
                return terms.some(
                  (t) =>
                    title.includes(t) ||
                    productType.includes(t) ||
                    variantTitles.some((vt) => vt.includes(t))
                );
              });
            }
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
    if (!requireShopConnection()) return;
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
      if (!window.electronAPI?.openaiChatWithFunctions) {
        throw new Error('OpenAI function calling is not available.');
      }
      const response = await window.electronAPI.openaiChatWithFunctions({
        messages: [
          {
            role: 'system',
            content:
              'You are an order creation assistant. Maintain a draft order from conversation and always call draft_order_intent with your structured state. ' +
              'Use action=search when you need product info (provide search_query). ' +
              'Use action=update_draft when updating the draft with line_items/email/note/shipping/billing. ' +
              'Capture shipping_address and billing_address as structured objects (name, address1, address2, city, province, zip, country, phone); set them to null when not provided. ' +
              'If required details are missing (SKU or variant, quantity, customer email, shipping/billing info), ask for them explicitly before attempting to submit and wait for the answer. ' +
              'Before submitting, summarize the draft (items, qty, SKU/variant) and ask the user to confirm. ' +
              'Use action=submit only after the user has clearly confirmed creation; set confirm_submit=true in that case. ' +
              'Respond with a helpful reply in reply. Always include every field in the schema; when a field is not applicable, set it to null (or [] for line_items).'
          },
          { role: 'user', content: `Current draft JSON: ${JSON.stringify(draft || {})}` },
          { role: 'user', content: trimmed }
        ],
        functions: openaiDraftFunctions,
        model: 'gpt-4o-mini',
        temperature: 0
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'OpenAI order composer failed');
      }

      const data = response.called?.args || {};
      console.log('[order-chat] openai draft args:', data);
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
      const replyContent =
        (response.message && (response.message.content || response.message.text)) || '';
      let combinedReply = data.reply ? String(data.reply) : replyContent;
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
      // Proactively prompt for missing required fields to keep the conversation moving.
      const draftSku = (data.line_items?.[0]?.sku || createSku || '').trim();
      const draftVariant = data.line_items?.[0]?.variant_id || createVariantId;
      const draftQty =
        (data.line_items?.[0]?.quantity ?? createQuantity ?? null) !== null
          ? Number(data.line_items?.[0]?.quantity ?? createQuantity)
          : null;
      const draftEmail = (data.email || createEmail || '').trim();
      const draftShip = nextShipping || shippingAddress || null;
      const missingFields = [];
      if (!draftSku && !draftVariant) {
        missingFields.push('a SKU or variant ID for at least one line item');
      }
      if (!draftQty || Number.isNaN(draftQty) || draftQty <= 0) {
        missingFields.push('a quantity (default 1 if not specified)');
      }
      if (!draftEmail) {
        missingFields.push('a customer email');
      }
      if (!draftShip || !draftShip.address1 || !draftShip.city || !draftShip.province || !draftShip.zip || !draftShip.country) {
        missingFields.push('a shipping address (name, address1, city, province/state, zip, country, phone)');
      }
      if (missingFields.length && data.action !== 'submit') {
        const promptLine = `I still need ${missingFields.join(', ')} before I can submit. Please provide these details.`;
        combinedReply = combinedReply ? `${combinedReply}\n\n${promptLine}` : promptLine;
      } else if (!missingFields.length && data.action !== 'submit') {
        const computedLineItems =
          draftSku || draftVariant
            ? [
                {
                  sku: draftSku || undefined,
                  variant_id: draftVariant ? Number(draftVariant) : undefined,
                  quantity: draftQty && !Number.isNaN(draftQty) ? draftQty : 1
                }
              ]
            : [];
        const computedDraft = {
          line_items: computedLineItems,
          note: schedulerQuery.trim() || undefined,
          email: draftEmail || undefined,
          shipping_address: draftShip || undefined,
          billing_address: nextBilling || billingAddress || draftShip || undefined
        };
        setPendingDraft(computedDraft);
        const summaryLine = `I have the draft ready: ${
          draftSku || draftVariant ? `item ${draftSku || `variant ${draftVariant}`} x ${computedLineItems[0]?.quantity || 1}` : 'no items yet'
        }, email ${draftEmail || 'missing'}, shipping ${draftShip ? 'provided' : 'missing'}. Should I submit this order to Shopify or would you like to edit anything? Say "confirm" to submit.`;
        combinedReply = combinedReply ? `${combinedReply}\n\n${summaryLine}` : summaryLine;
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
      setOrdersError(error.message || 'OpenAI order composer failed');
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

  const handleOpenAIFunctionOrders = async () => {
    if (!requireShopConnection()) return;
    if (!nlQuery.trim()) {
      return;
    }
    if (!window.electronAPI?.openaiChatWithFunctions) {
      setOrdersError('OpenAI function calling is not available in this build.');
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
        const { params, meta } = await callOpenAIListOrders(nlQuery.trim());
        console.log('[orders] openai function params:', params, 'meta:', meta);
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

      // Heuristic: extract a line-item title fragment (inexact match)
      // Always derive date range from the user query (ignore model-provided dates to avoid stale ranges).
      // Always derive date range from user text for relative dates to avoid stale/model-supplied ranges.
      const { created_at_min, created_at_max } = deriveDateRangeFromQuery(
        meta?.hasDateCue ? nlQuery : '',
        undefined,
        undefined,
        shopTimeZone
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
      const effectiveStatus = normalizedStatus || 'any';
      if (effectiveStatus) cleanedPayload.status = effectiveStatus;
      if (normalizedFinancialStatus) cleanedPayload.financial_status = normalizedFinancialStatus;
      // For exact order lookups, avoid over-filtering with status/date constraints
      if (derivedOrderNumber || derivedOrderId) {
        cleanedPayload.status = 'any';
        cleanedPayload.limit = 250;
        delete cleanedPayload.financial_status;
        delete cleanedPayload.fulfillment_status;
        delete cleanedPayload.created_at_min;
        delete cleanedPayload.created_at_max;
      }

      await handleFetchOrders(cleanedPayload);
    } catch (error) {
      setOrdersError(error.message || 'Failed to process OpenAI request');
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
          ,
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
        h(
          Main,
          null,
          logs.length
            ? h('div', { id: 'log-panel' }, h(LogList, { entries: logs, onSelect: setSelectedAutomation, onDelete: handleDeleteAutomation }))
            : null,
          selectedAutomation
            ? h(AutomationModalDetail, {
                entry: selectedAutomation,
                onClose: () => setSelectedAutomation(null)
              })
            : null
        )
      ),
      h(
        Shell,
        null,
        h(Header, { status, label: 'Order Management Hub' }),
        h(
          Main,
          null,
          h(
            'div',
            {
              style: {
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }
            },
            h(
              'button',
              {
                onClick: () => setShowConnectModal(true),
                style: {
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: '#000',
                  color: '#fff',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                  cursor: 'pointer'
                }
              },
              shopState.active ? 'Reconnect Shopify' : 'Connect Shopify'
            ),
            h('span', { className: 'order-sub' }, `${shopState.status}`)
          ),
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
          insightModalOpen
            ? h(InsightsModal, {
                open: insightModalOpen,
                onClose: () => setInsightModalOpen(false),
                messages: insightMessages,
                onSendMessage: handleSendInsightMessage,
                inputValue: insightInput,
                onInputChange: setInsightInput,
                submitting: insightLoading,
                messagesEndRef: insightMessagesEndRef,
                onDownloadCsv: lastCsv
                  ? () => {
                      const blob = new Blob([lastCsv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'orders.csv';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }
                  : null
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
                h(CreatedOrdersCarousel, { orders: createdOrders, onSelect: setSelectedOrder })
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
          setEditCommitted(false);
        },
        orderCount: (editTargets.length || orders.length),
        messages: editMessages,
        onSendMessage: handleEditSendMessage,
        onInputChange: setEditInput,
        inputValue: editInput,
        submitting: editProcessing,
        messagesEndRef: editMessagesEndRef,
        showAutomationButton: editCommitted,
        onCreateAutomation: () => {
          setAutomationMessages([
            {
              role: 'assistant',
              text:
                'Tell me how often you want to run this recurring automation. ShopifAI will combine your search query with the edit operation you just performed and run it on the schedule you define here.'
            }
          ]);
          setAutomationInput('');
          setShowAutomationModal(true);
          setEditCommitted(false);
        }
      }),
      h(AutomationModal, {
        open: showAutomationModal,
        onClose: () => {
          setShowAutomationModal(false);
          setAutomationInput('');
        },
        messages: automationMessages,
        onSendMessage: handleAutomationSendMessage,
        onInputChange: setAutomationInput,
        inputValue: automationInput,
        submitting: automationProcessing,
        messagesEndRef: automationMessagesEndRef
      }),
      showConnectModal
        ? h(
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
              onClick: () => setShowConnectModal(false)
            },
            h(
              'div',
              {
                style: {
                  background: 'rgba(255,255,255,0.12)',
                  color: '#e8f4ec',
                  borderRadius: '6px',
                  padding: '20px',
                  width: 'min(520px, 90vw)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 18px 38px rgba(0,0,0,0.4)',
                  position: 'relative'
                },
                onClick: (e) => e.stopPropagation()
              },
              h(
                'button',
                {
                  onClick: () => setShowConnectModal(false),
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
              h('h2', null, shopState.active ? 'Reconnect Shopify' : 'Connect Shopify'),
              h(
                'p',
                { className: 'order-sub', style: { marginBottom: '8px' } },
                'Enter your shop domain and Admin API access token. Tokens are stored securely and never exposed to end-users.'
              ),
              h('input', {
                type: 'text',
                placeholder: 'my-shop.myshopify.com',
                value: shopDomainInput,
                onChange: (e) => setShopDomainInput(e.target.value),
                style: {
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  marginBottom: '10px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#e8f4ec'
                }
              }),
              h('input', {
                type: 'password',
                placeholder: 'Admin API access token',
                value: shopTokenInput,
                onChange: (e) => setShopTokenInput(e.target.value),
                style: {
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  marginBottom: '12px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#e8f4ec'
                }
              }),
              h(
                'div',
                { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' } },
                h(
                  'button',
                  {
                    onClick: () => setShowConnectModal(false),
                    style: {
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.2)',
                      color: '#0f1b14',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer'
                    }
                  },
                  'Cancel'
                ),
                h(
                  'button',
                  {
                    onClick: handleConnectShopify,
                    style: {
                      padding: '10px 14px',
                      borderRadius: '6px',
                      background: '#000',
                      color: '#fff',
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                      cursor: 'pointer'
                    }
                  },
                  'Save & Connect'
                )
              )
            )
          )
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
            onClick: handleOpenAIFunctionOrders,
            disabled: nlProcessing || ordersLoading || !nlQuery.trim()
          },
          nlProcessing ? 'Working…' : 'Search Shopify'
        )
        )
      ),
      aiAnalysisLoading || aiAnalysis || aiAnalysisError
        ? h(
            Panel,
            { title: 'AI Insights', description: 'Redacted summary from Codex' },
            aiAnalysisLoading
              ? h('p', { className: 'order-sub' }, 'Analyzing results…')
              : aiAnalysisError
                ? h('p', { className: 'order-sub' }, aiAnalysisError)
                : renderAiAnalysisContent()
          )
        : null,
      hasQueriedOrders && orders.length > 0 && !ordersLoading && !nlProcessing
        ? h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '12px',
                gap: '8px',
                flexWrap: 'wrap'
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
            ),
            h(
              ActionButton,
              {
                onClick: () => {
                  setInsightModalOpen(true);
                  if (!insightMessages.length) {
                    setInsightMessages([
                      {
                        role: 'assistant',
                        text:
                          'Ask me to summarize trends, export a CSV, or list top performers for these orders.'
                      }
                    ]);
                  }
                }
              },
              h(
                'span',
                null,
                'Ask Shopif',
                h('span', { style: { color: 'rgba(149,191,72,0.95)', fontWeight: 700 } }, 'AI')
              )
            )
          )
        : null,
      h(OrdersList, {
        orders,
        loading: ordersLoading,
        error: ordersError,
        queried: hasQueriedOrders,
        onSelect: setSelectedOrder,
        onShowAll: handleShowAllOrders
      })
    )
  )
)
  );
}

const root = document.getElementById('root');
ReactDOM.createRoot(root).render(h(App));
