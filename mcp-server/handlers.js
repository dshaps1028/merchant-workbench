// Minimal, testable versions of core Shopify handlers with an injected shopifyRequest dependency.

const createOrderHandler = async (args = {}, shopifyRequest) => {
  if (!shopifyRequest) throw new Error('shopifyRequest is required');
  if (!Array.isArray(args.line_items) || args.line_items.length === 0) {
    throw new Error('line_items is required and must be a non-empty array');
  }

  const sanitizeLineItem = (item) => {
    const cleaned = {};
    if (item.variant_id) cleaned.variant_id = item.variant_id;
    if (item.product_id) cleaned.product_id = item.product_id;
    if (item.title) cleaned.title = item.title;
    if (item.sku) cleaned.sku = item.sku;
    cleaned.quantity = Math.max(1, Number(item.quantity) || 1);
    return cleaned;
  };

  const orderPayload = {
    line_items: args.line_items.map(sanitizeLineItem)
  };

  if (args.email) orderPayload.email = args.email;
  if (args.shipping_address) orderPayload.shipping_address = args.shipping_address;
  if (args.billing_address) orderPayload.billing_address = args.billing_address;
  if (args.note) orderPayload.note = args.note;
  if (args.tags) orderPayload.tags = args.tags;
  if (args.financial_status) orderPayload.financial_status = args.financial_status;
  if (args.fulfillment_status) orderPayload.fulfillment_status = args.fulfillment_status;
  if (args.test !== undefined) orderPayload.test = !!args.test;

  const data = await shopifyRequest('orders.json', {
    method: 'POST',
    body: JSON.stringify({ order: orderPayload })
  });
  const order = data && data.order ? data.order : null;

  return {
    content: [
      {
        type: 'text',
        text: order
          ? `Created order ${order.name || order.id}\nTotal: ${order.total_price || 'N/A'} ${
              order.currency || ''
            }`
          : 'Created order.'
      }
    ],
    structuredContent: order ? { order } : undefined
  };
};

const updateOrderHandler = async (args = {}, shopifyRequest) => {
  if (!shopifyRequest) throw new Error('shopifyRequest is required');
  const orderId = args.order_id;
  if (!orderId) {
    throw new Error('order_id is required');
  }

  const payload = { id: orderId };
  if (args.email) payload.email = args.email;
  if (args.phone) payload.phone = args.phone;
  if (args.note) payload.note = args.note;
  if (args.tags) payload.tags = args.tags;
  if (args.financial_status) payload.financial_status = args.financial_status;
  if (args.fulfillment_status) payload.fulfillment_status = args.fulfillment_status;
  if (args.shipping_address) payload.shipping_address = args.shipping_address;
  if (args.billing_address) payload.billing_address = args.billing_address;

  const data = await shopifyRequest(`orders/${orderId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ order: payload })
  });
  const order = data && data.order ? data.order : null;

  return {
    content: [
      {
        type: 'text',
        text: order ? `Updated order ${order.name || order.id}` : `Order ${orderId} updated.`
      }
    ],
    structuredContent: order ? { order } : undefined
  };
};

module.exports = {
  createOrderHandler,
  updateOrderHandler
};
