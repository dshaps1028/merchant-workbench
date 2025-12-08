const { createOrderHandler, updateOrderHandler } = require('../mcp-server/handlers');

describe('mcp-server handlers (order create/update)', () => {
  test('createOrderHandler builds payload and returns structured order', async () => {
    const mockShopifyRequest = jest.fn().mockResolvedValue({
      order: {
        id: 1,
        name: '#1001',
        total_price: '20.00',
        currency: 'USD'
      }
    });

    const args = {
      line_items: [{ variant_id: 123, quantity: 2, sku: 'sku-1' }],
      email: 'test@example.com',
      note: 'test order',
      tags: 'vip'
    };

    const res = await createOrderHandler(args, mockShopifyRequest);
    expect(mockShopifyRequest).toHaveBeenCalledWith('orders.json', expect.any(Object));
    const callOpts = mockShopifyRequest.mock.calls[0][1];
    const body = JSON.parse(callOpts.body);
    expect(body.order.line_items[0]).toMatchObject({ variant_id: 123, quantity: 2, sku: 'sku-1' });
    expect(body.order.email).toBe('test@example.com');
    expect(body.order.note).toBe('test order');
    expect(res.structuredContent.order.id).toBe(1);
  });

  test('createOrderHandler throws if missing line items', async () => {
    await expect(createOrderHandler({}, jest.fn())).rejects.toThrow(/line_items/);
  });

  test('updateOrderHandler builds payload and returns structured order', async () => {
    const mockShopifyRequest = jest.fn().mockResolvedValue({
      order: { id: 1, name: '#1001', tags: 'vip' }
    });

    const args = {
      order_id: '1',
      tags: 'vip',
      note: 'updated'
    };

    const res = await updateOrderHandler(args, mockShopifyRequest);
    expect(mockShopifyRequest).toHaveBeenCalledWith(
      'orders/1.json',
      expect.objectContaining({ method: 'PUT' })
    );
    const body = JSON.parse(mockShopifyRequest.mock.calls[0][1].body);
    expect(body.order.tags).toBe('vip');
    expect(body.order.note).toBe('updated');
    expect(res.structuredContent.order.name).toBe('#1001');
  });

  test('updateOrderHandler throws without order_id', async () => {
    await expect(updateOrderHandler({}, jest.fn())).rejects.toThrow(/order_id/);
  });
});
