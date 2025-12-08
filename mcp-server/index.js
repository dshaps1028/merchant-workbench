#!/usr/bin/env node

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const accessTokenArg = process.argv.find((arg) => arg.startsWith('--accessToken='));
const domainArg = process.argv.find((arg) => arg.startsWith('--domain='));

const SHOPIFY_ACCESS_TOKEN =
	process.env.SHOPIFY_ACCESS_TOKEN ||
	(accessTokenArg ? accessTokenArg.split('=')[1] : undefined);
const SHOPIFY_DOMAIN =
	process.env.SHOPIFY_DOMAIN ||
	(domainArg ? domainArg.split('=')[1] : undefined);

if (!SHOPIFY_ACCESS_TOKEN || !SHOPIFY_DOMAIN) {
	console.error('Error: SHOPIFY_ACCESS_TOKEN and SHOPIFY_DOMAIN are required');
	console.error('Usage: mcp-shopify --accessToken=YOUR_TOKEN --domain=YOUR_STORE.myshopify.com');
	console.error('Or set environment variables: SHOPIFY_ACCESS_TOKEN and SHOPIFY_DOMAIN');
	process.exit(1);
}

const SHOPIFY_API_URL = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/`;

class ShopifyMCPServer {
	constructor() {
		this.server = new Server(
			{
				name: 'mcp-shopify',
				version: '1.0.0',
			},
			{
				capabilities: {
					tools: {},
				},
			}
		);

		this.setupToolHandlers();
		this.server.onerror = (error) => console.error('[MCP Error]', error);
		process.on('SIGINT', async () => {
			await this.server.close();
			process.exit(0);
		});
	}

	setupToolHandlers() {
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: [
				// Product Management
				{
					name: 'list_products',
					description: 'List products from your Shopify store',
					inputSchema: {
						type: 'object',
						properties: {
							limit: {
								type: 'number',
								description: 'Number of products (default: 10)',
								default: 10,
							},
							product_type: { type: 'string', description: 'Filter by product type' },
							vendor: { type: 'string', description: 'Filter by vendor' },
							status: {
								type: 'string',
								description: 'Filter by status (active, archived, draft)',
								enum: ['active', 'archived', 'draft'],
							},
							collection_id: {
								type: 'string',
								description: 'Filter by collection ID',
							},
						},
					},
				},
				{
					name: 'get_product',
					description: 'Get detailed information about a specific product',
					inputSchema: {
						type: 'object',
						properties: {
							product_id: {
								type: 'string',
								description: 'The product ID',
								required: true,
							},
						},
						required: ['product_id'],
					},
				},
				{
					name: 'search_products',
					description: 'Search products by title or SKU',
					inputSchema: {
						type: 'object',
						properties: {
							query: { type: 'string', description: 'Search query', required: true },
							limit: {
								type: 'number',
								description: 'Number of results (default: 10)',
								default: 10,
							},
						},
						required: ['query'],
					},
				},
				{
					name: 'get_product_variants',
					description: 'Get all variants for a specific product',
					inputSchema: {
						type: 'object',
						properties: {
							product_id: {
								type: 'string',
								description: 'The product ID',
								required: true,
							},
						},
						required: ['product_id'],
					},
				},
				{
					name: 'get_inventory_levels',
					description: 'Get inventory levels for products',
					inputSchema: {
						type: 'object',
						properties: {
							location_id: { type: 'string', description: 'Location ID (optional)' },
							limit: {
								type: 'number',
								description: 'Number of items (default: 10)',
								default: 10,
							},
						},
					},
				},

				// Order Management
					{
						name: 'list_orders',
						description: 'List orders from your Shopify store',
						inputSchema: {
							type: 'object',
						properties: {
							limit: {
								type: 'number',
								description: 'Number of orders (default: 10)',
								default: 10,
							},
							status: {
								type: 'string',
								description: 'Filter by status',
								enum: ['open', 'closed', 'cancelled', 'any'],
							},
							financial_status: {
								type: 'string',
								description: 'Filter by payment status',
								enum: [
									'authorized',
									'pending',
									'paid',
									'partially_paid',
									'refunded',
									'voided',
									'partially_refunded',
									'unpaid',
								],
							},
							fulfillment_status: {
								type: 'string',
								description: 'Filter by fulfillment status',
								enum: [
									'shipped',
									'partial',
									'unshipped',
									'unfulfilled',
									'fulfilled',
								],
							},
							created_at_min: {
								type: 'string',
								description: 'Orders created after this date (ISO 8601)',
							},
							created_at_max: {
								type: 'string',
								description: 'Orders created before this date (ISO 8601)',
							},
							email: {
								type: 'string',
								description: 'Filter by customer email (client-side filter)',
							},
							order_id: {
								type: 'string',
								description: 'Filter by exact order ID (client-side filter)',
							},
							order_number: {
								type: 'string',
								description: 'Filter by exact order number/name (client-side filter)',
							},
								customer_name: {
									type: 'string',
									description: 'Filter by customer name substring (client-side filter)',
								},
							},
						},
					},
				{
					name: 'create_order',
					description: 'Create a new order with line items and customer details',
					inputSchema: {
						type: 'object',
							properties: {
								email: { type: 'string', description: 'Customer email', nullable: true },
								line_items: {
									type: 'array',
									description: 'Array of line items to include in the order',
									items: {
										type: 'object',
										properties: {
											variant_id: { type: 'integer', nullable: true },
											product_id: { type: 'integer', nullable: true },
											title: { type: 'string', nullable: true },
											sku: { type: 'string', nullable: true },
											quantity: { type: 'integer' },
										},
										required: ['quantity'],
									},
								},
								shipping_address: { type: 'object', nullable: true },
								billing_address: { type: 'object', nullable: true },
								note: { type: 'string', nullable: true },
								tags: { type: 'string', nullable: true },
								financial_status: { type: 'string', nullable: true },
								fulfillment_status: { type: 'string', nullable: true },
								test: { type: 'boolean', nullable: true },
							},
							required: ['line_items'],
						},
					},
					{
						name: 'update_order',
						description: 'Update an existing order (note, email, addresses, tags)',
						inputSchema: {
							type: 'object',
							properties: {
								order_id: {
									type: 'string',
									description: 'The order ID to update',
								},
								email: { type: 'string', nullable: true },
								phone: { type: 'string', nullable: true },
								note: { type: 'string', nullable: true },
								tags: { type: 'string', nullable: true },
								shipping_address: { type: 'object', nullable: true },
								billing_address: { type: 'object', nullable: true },
								financial_status: { type: 'string', nullable: true },
								fulfillment_status: { type: 'string', nullable: true },
							},
							required: ['order_id'],
					},
				},
				{
					name: 'get_order',
					description: 'Get detailed information about a specific order',
					inputSchema: {
						type: 'object',
						properties: {
							order_id: {
								type: 'string',
								description: 'The order ID',
								required: true,
							},
						},
						required: ['order_id'],
					},
				},
				{
					name: 'get_order_transactions',
					description: 'Get transactions for a specific order',
					inputSchema: {
						type: 'object',
						properties: {
							order_id: {
								type: 'string',
								description: 'The order ID',
								required: true,
							},
						},
						required: ['order_id'],
					},
				},

				// Customer Management
				{
					name: 'list_customers',
					description: 'List customers from your Shopify store',
					inputSchema: {
						type: 'object',
						properties: {
							limit: {
								type: 'number',
								description: 'Number of customers (default: 10)',
								default: 10,
							},
							created_at_min: {
								type: 'string',
								description: 'Customers created after this date',
							},
							created_at_max: {
								type: 'string',
								description: 'Customers created before this date',
							},
						},
					},
				},
				{
					name: 'get_customer',
					description: 'Get detailed information about a specific customer',
					inputSchema: {
						type: 'object',
						properties: {
							customer_id: {
								type: 'string',
								description: 'The customer ID',
								required: true,
							},
						},
						required: ['customer_id'],
					},
				},
				{
					name: 'search_customers',
					description: 'Search customers by name, email, or phone',
					inputSchema: {
						type: 'object',
						properties: {
							query: { type: 'string', description: 'Search query', required: true },
							limit: {
								type: 'number',
								description: 'Number of results (default: 10)',
								default: 10,
							},
						},
						required: ['query'],
					},
				},
				{
					name: 'get_customer_orders',
					description: 'Get all orders for a specific customer',
					inputSchema: {
						type: 'object',
						properties: {
							customer_id: {
								type: 'string',
								description: 'The customer ID',
								required: true,
							},
							limit: {
								type: 'number',
								description: 'Number of orders (default: 10)',
								default: 10,
							},
						},
						required: ['customer_id'],
					},
				},

				// Analytics & Reports
				{
					name: 'get_shop_info',
					description: 'Get general information about the shop',
					inputSchema: { type: 'object', properties: {} },
				},
				{
					name: 'get_sales_summary',
					description: 'Get sales summary and statistics',
					inputSchema: {
						type: 'object',
						properties: {
							date_from: { type: 'string', description: 'Start date (ISO 8601)' },
							date_to: { type: 'string', description: 'End date (ISO 8601)' },
						},
					},
				},
				{
					name: 'get_best_sellers',
					description: 'Analyze best-selling products',
					inputSchema: {
						type: 'object',
						properties: {
							limit: {
								type: 'number',
								description: 'Number of top products (default: 10)',
								default: 10,
							},
							days: {
								type: 'number',
								description: 'Number of days to analyze (default: 30)',
								default: 30,
							},
						},
					},
				},
				{
					name: 'get_locations',
					description: 'Get all shop locations',
					inputSchema: { type: 'object', properties: {} },
				},

				// Collections
				{
					name: 'list_collections',
					description: 'List all collections (smart and custom)',
					inputSchema: {
						type: 'object',
						properties: {
							limit: {
								type: 'number',
								description: 'Number of collections (default: 10)',
								default: 10,
							},
							collection_type: {
								type: 'string',
								description: 'Type of collection',
								enum: ['smart', 'custom'],
							},
						},
					},
				},
				{
					name: 'get_collection_products',
					description: 'Get all products in a specific collection',
					inputSchema: {
						type: 'object',
						properties: {
							collection_id: {
								type: 'string',
								description: 'The collection ID',
								required: true,
							},
							limit: {
								type: 'number',
								description: 'Number of products (default: 10)',
								default: 10,
							},
						},
						required: ['collection_id'],
					},
				},

				// Discounts & Price Rules
				{
					name: 'list_discounts',
					description: 'List all discount codes',
					inputSchema: {
						type: 'object',
						properties: {
							limit: {
								type: 'number',
								description: 'Number of discounts (default: 10)',
								default: 10,
							},
						},
					},
				},
				{
					name: 'get_discount',
					description: 'Get details about a specific discount',
					inputSchema: {
						type: 'object',
						properties: {
							discount_id: {
								type: 'string',
								description: 'The discount ID',
								required: true,
							},
						},
						required: ['discount_id'],
					},
				},

				// Metafields
				{
					name: 'get_product_metafields',
					description: 'Get metafields for a product',
					inputSchema: {
						type: 'object',
						properties: {
							product_id: {
								type: 'string',
								description: 'The product ID',
								required: true,
							},
						},
						required: ['product_id'],
					},
				},

				// Fulfillment
				{
					name: 'list_fulfillment_services',
					description: 'List all fulfillment services',
					inputSchema: { type: 'object', properties: {} },
				},
				{
					name: 'get_shipping_zones',
					description: 'Get all shipping zones and rates',
					inputSchema: { type: 'object', properties: {} },
				},
			],
		}));

		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;

			try {
				switch (name) {
					// Product Management
					case 'list_products':
						return await this.listProducts(args);
					case 'get_product':
						return await this.getProduct(args);
					case 'search_products':
						return await this.searchProducts(args);
					case 'get_product_variants':
						return await this.getProductVariants(args);
					case 'get_inventory_levels':
						return await this.getInventoryLevels(args);

					// Order Management
					case 'list_orders':
						return await this.listOrders(args);
					case 'create_order':
						return await this.createOrder(args);
					case 'update_order':
						return await this.updateOrder(args);
					case 'get_order':
						return await this.getOrder(args);
					case 'get_order_transactions':
						return await this.getOrderTransactions(args);

					// Customer Management
					case 'list_customers':
						return await this.listCustomers(args);
					case 'get_customer':
						return await this.getCustomer(args);
					case 'search_customers':
						return await this.searchCustomers(args);
					case 'get_customer_orders':
						return await this.getCustomerOrders(args);

					// Analytics & Reports
					case 'get_shop_info':
						return await this.getShopInfo();
					case 'get_sales_summary':
						return await this.getSalesSummary(args);
					case 'get_best_sellers':
						return await this.getBestSellers(args);
					case 'get_locations':
						return await this.getLocations();

					// Collections
					case 'list_collections':
						return await this.listCollections(args);
					case 'get_collection_products':
						return await this.getCollectionProducts(args);

					// Discounts
					case 'list_discounts':
						return await this.listDiscounts(args);
					case 'get_discount':
						return await this.getDiscount(args);

					// Metafields
					case 'get_product_metafields':
						return await this.getProductMetafields(args);

					// Fulfillment
					case 'list_fulfillment_services':
						return await this.listFulfillmentServices();
					case 'get_shipping_zones':
						return await this.getShippingZones();

					default:
						throw new Error(`Unknown tool: ${name}`);
				}
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error: ${error.message}`,
						},
					],
				};
			}
		});
	}

	async shopifyRequest(endpoint, options = {}) {
		const fetch = (await import('node-fetch')).default;
		const url = `${SHOPIFY_API_URL}${endpoint}`;

		const response = await fetch(url, {
			headers: {
				'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
				'Content-Type': 'application/json',
				Accept: 'application/json',
				...options.headers,
			},
			...options,
		});

		if (!response.ok) {
			const errorText = await response.text();
			const msg = `Shopify API error: ${response.status} ${response.statusText} - ${errorText}`;
			console.error('[shopifyRequest]', msg);
			throw new Error(msg);
		}

		return await response.json();
	}

	// Product Management Tools
	async listProducts(args = {}) {
		const params = new URLSearchParams();
		if (args.limit) params.append('limit', args.limit);
		if (args.product_type) params.append('product_type', args.product_type);
		if (args.vendor) params.append('vendor', args.vendor);
		if (args.status) params.append('status', args.status);
		if (args.collection_id) params.append('collection_id', args.collection_id);
		params.append('fields', 'id,title,handle,product_type,vendor,status,variants');

		const data = await this.shopifyRequest(`products.json?${params}`);

		const products = data.products.map((product) => ({
			id: product.id,
			title: product.title,
			handle: product.handle,
			product_type: product.product_type,
			vendor: product.vendor,
			status: product.status,
			variants: (product.variants || []).map((v) => ({
				id: v.id,
				sku: v.sku,
				title: v.title,
				price: v.price,
				currency: v.currency_code,
				inventory: v.inventory_quantity,
			})),
		}));

		return {
			content: [
				{
					type: 'text',
					text:
						`Found ${products.length} products:\n\n` +
						products
							.map(
								(product) =>
									`• ${product.title} (Product ID: ${product.id})\n` +
									`  Type: ${product.product_type || 'N/A'} • Vendor: ${product.vendor || 'N/A'} • Status: ${product.status || 'N/A'}\n` +
									(product.variants && product.variants.length
										? product.variants
												.slice(0, 3)
												.map(
													(v) =>
														`  - Variant ID: ${v.id || 'N/A'} • SKU: ${v.sku || 'N/A'} • ${v.price || 'N/A'} ${v.currency || ''}`
												)
												.join('\n')
										: '  No variants')
							)
							.join('\n\n'),
				},
			],
			structuredContent: { products },
		};
	}

	async getProduct(args) {
		const data = await this.shopifyRequest(`products/${args.product_id}.json`);
		const product = data.product;

		return {
			content: [
				{
					type: 'text',
					text:
						`Product: ${product.title}\n` +
						`ID: ${product.id}\n` +
						`Status: ${product.status}\n` +
						`Type: ${product.product_type || 'N/A'}\n` +
						`Vendor: ${product.vendor}\n` +
						`Created: ${new Date(product.created_at).toLocaleDateString()}\n` +
						`Tags: ${product.tags}\n` +
						`\nVariants (${product.variants.length}):\n` +
						product.variants
							.map(
								(v) =>
									`  - ${v.title || 'Default'}: ${v.price} ${v.currency_code || ''} (SKU: ${v.sku || 'N/A'}, Stock: ${v.inventory_quantity})`
							)
							.join('\n') +
						`\n\nDescription: ${product.body_html ? product.body_html.replace(/<[^>]*>/g, '').slice(0, 200) : ''}...`,
				},
			],
		};
	}

	async searchProducts(args) {
		const data = await this.shopifyRequest(
			`products.json?title=${encodeURIComponent(args.query)}&limit=${args.limit || 10}&fields=id,title,handle,product_type,vendor,status,variants`
		);

		if (data.products.length === 0) {
			// Try searching in product listings
			const searchData = await this.shopifyRequest(
				`products/search.json?query=${encodeURIComponent(args.query)}&limit=${args.limit || 10}`
			).catch(() => null);
			if (searchData && searchData.products) {
				data.products = searchData.products;
			}
		}

		const products = data.products.map((product) => ({
			id: product.id,
			title: product.title,
			handle: product.handle,
			product_type: product.product_type,
			vendor: product.vendor,
			status: product.status,
			variants: (product.variants || []).map((v) => ({
				id: v.id,
				sku: v.sku,
				title: v.title,
				price: v.price,
				currency: v.currency_code,
				inventory: v.inventory_quantity,
			})),
		}));

		return {
			content: [
				{
					type: 'text',
					text:
						`Found ${products.length} products matching "${args.query}":\n\n` +
						products
							.map(
								(product) =>
									`• ${product.title} (Product ID: ${product.id})\n` +
									`  Type: ${product.product_type || 'N/A'} • Vendor: ${product.vendor || 'N/A'} • Status: ${product.status || 'N/A'}\n` +
									(product.variants && product.variants.length
										? product.variants
												.slice(0, 3)
												.map(
													(v) =>
														`  - Variant ID: ${v.id || 'N/A'} • SKU: ${v.sku || 'N/A'} • ${v.price || 'N/A'} ${v.currency || ''}`
												)
												.join('\n')
										: '  No variants')
							)
							.join('\n\n'),
				},
			],
			structuredContent: { products },
		};
	}

	async getProductVariants(args) {
		const data = await this.shopifyRequest(`products/${args.product_id}.json`);
		const product = data.product;

		return {
			content: [
				{
					type: 'text',
					text:
						`Variants for "${product.title}" (${product.variants.length} total):\n\n` +
						product.variants
							.map(
								(v, i) =>
									`${i + 1}. ${v.title || 'Default Variant'}\n` +
									`   ID: ${v.id}\n` +
									`   SKU: ${v.sku || 'N/A'}\n` +
									`   Price: ${v.price} ${v.currency_code || ''}\n` +
									`   Weight: ${v.weight} ${v.weight_unit}\n` +
									`   Inventory: ${v.inventory_quantity} units\n` +
									`   Barcode: ${v.barcode || 'N/A'}`
							)
							.join('\n\n'),
				},
			],
		};
	}

	async getInventoryLevels(args = {}) {
		const data = await this.shopifyRequest(`inventory_levels.json?limit=${args.limit || 10}`);

		return {
			content: [
				{
					type: 'text',
					text:
						`Inventory Levels:\n\n` +
						data.inventory_levels
							.map(
								(level) =>
									`• Location ${level.location_id}\n` +
									`  Inventory Item: ${level.inventory_item_id}\n` +
									`  Available: ${level.available}\n` +
									`  Updated: ${new Date(level.updated_at).toLocaleDateString()}`
							)
							.join('\n\n'),
				},
			],
		};
	}

	// Order Management Tools
	async listOrders(args = {}) {
		const params = new URLSearchParams();
		const orderNumberValue = args.order_number || args.name;
		const orderNumberMode = !!orderNumberValue;

		if (args.limit) {
			params.append('limit', args.limit);
		} else if (orderNumberMode) {
			params.append('limit', '250');
		}

		if (orderNumberMode) {
			params.append('status', 'any');
			// Use Shopify "name" query to target order name/order_number directly
			params.append('name', orderNumberValue);
		} else if (args.status) {
			params.append('status', args.status);
		}

		if (!orderNumberMode) {
			if (args.financial_status) params.append('financial_status', args.financial_status);
			if (args.fulfillment_status) params.append('fulfillment_status', args.fulfillment_status);
			if (args.created_at_min) params.append('created_at_min', args.created_at_min);
			if (args.created_at_max) params.append('created_at_max', args.created_at_max);
		}

		// Log to stderr to avoid breaking MCP stdio protocol
		console.error('[mcp] list_orders args:', JSON.stringify(args));
		console.error('[mcp] list_orders request params:', params.toString());

		const data = await this.shopifyRequest(`orders.json?${params}`);
		let orders = data.orders || [];
		console.error('[mcp] list_orders initial count:', orders.length);

		// Optional client-side filters for email (Shopify API doesn't support direct email filtering on list)
		if (args.email) {
			const needle = args.email.toLowerCase();
			orders = orders.filter(
				(order) =>
					(order.email && order.email.toLowerCase().includes(needle)) ||
					(order.customer && order.customer.email && order.customer.email.toLowerCase().includes(needle))
			);
		}

		// Filter by order ID
		if (args.order_id) {
			const target = String(args.order_id).trim();
			orders = orders.filter(
				(order) =>
					String(order.id) === target ||
					(order.admin_graphql_api_id && order.admin_graphql_api_id.endsWith(target))
			);
		}

		// Filter by order number/name (exact match)
		if (orderNumberMode) {
			const needle = String(orderNumberValue).toLowerCase().trim();
			orders = orders.filter(
				(order) =>
					(order.name &&
						order.name.toLowerCase().replace(/^#/, '') === needle.replace(/^#/, '')) ||
					(order.order_number &&
						String(order.order_number).toLowerCase().replace(/^#/, '') === needle.replace(/^#/, '')) ||
					(order.name &&
						order.name.toLowerCase().replace(/^#/, '').includes(needle.replace(/^#/, ''))) ||
					(order.order_number &&
						String(order.order_number).toLowerCase().replace(/^#/, '').includes(needle.replace(/^#/, '')))
			);

			// If not found in the initial 250, retry with name and search endpoints
				if (orders.length === 0) {
					const nameParams = new URLSearchParams();
					nameParams.append('status', 'any');
					nameParams.append('limit', '250');
					nameParams.append('name', args.order_number);
				const nameData = await this.shopifyRequest(`orders.json?${nameParams}`).catch(() => null);
				if (nameData && nameData.orders) {
					orders = nameData.orders.filter(
						(order) =>
							(order.name &&
								order.name.toLowerCase().replace(/^#/, '') === needle.replace(/^#/, '')) ||
							(order.order_number &&
								String(order.order_number).toLowerCase().replace(/^#/, '') === needle.replace(/^#/, '')) ||
							(order.name &&
								order.name.toLowerCase().replace(/^#/, '').includes(needle.replace(/^#/, ''))) ||
							(order.order_number &&
								String(order.order_number).toLowerCase().replace(/^#/, '').includes(needle.replace(/^#/, '')))
					);
				}

				if (orders.length === 0) {
					const searchQueries = [
						`name:${orderNumberValue}`,
						`name:"#${orderNumberValue}"`,
						`name:${orderNumberValue} OR name:"#${orderNumberValue}"`
					];

					for (const q of searchQueries) {
						const searchParams = new URLSearchParams();
						searchParams.append('query', q);
						searchParams.append('status', 'any');
						searchParams.append('limit', '100');
						const searchData = await this.shopifyRequest(`orders/search.json?${searchParams}`).catch(
							() => null
						);
						if (searchData && searchData.orders && searchData.orders.length) {
							orders = searchData.orders.filter(
								(order) =>
									(order.name &&
										order.name.toLowerCase().replace(/^#/, '') === needle.replace(/^#/, '')) ||
									(order.order_number &&
										String(order.order_number).toLowerCase().replace(/^#/, '') === needle.replace(/^#/, '')) ||
									(order.name &&
										order.name.toLowerCase().replace(/^#/, '').includes(needle.replace(/^#/, ''))) ||
									(order.order_number &&
										String(order.order_number).toLowerCase().replace(/^#/, '').includes(needle.replace(/^#/, '')))
							);
							if (orders.length) break;
						}
					}

					// Broad search fallback without name: prefix
					if (orders.length === 0) {
						const rawQueries = [
							String(orderNumberValue),
							`"${orderNumberValue}"`,
							`#${orderNumberValue}`
						];

						for (const rq of rawQueries) {
							const searchParams = new URLSearchParams();
							searchParams.append('query', rq);
							searchParams.append('status', 'any');
							searchParams.append('limit', '100');
							const searchData = await this.shopifyRequest(`orders/search.json?${searchParams}`).catch(
								() => null
							);
							if (searchData && searchData.orders && searchData.orders.length) {
								orders = searchData.orders.filter(
									(order) =>
										(order.name &&
											order.name.toLowerCase().replace(/^#/, '') === needle.replace(/^#/, '')) ||
										(order.order_number &&
											String(order.order_number).toLowerCase().replace(/^#/, '') === needle.replace(/^#/, '')) ||
										(order.name &&
											order.name.toLowerCase().replace(/^#/, '').includes(needle.replace(/^#/, ''))) ||
										(order.order_number &&
											String(order.order_number).toLowerCase().replace(/^#/, '').includes(needle.replace(/^#/, '')))
								);
								if (orders.length) break;
							}
						}
					}
				}
			}

			// In order-number mode, return early without additional filters
			console.error('[mcp] list_orders (order_number mode) final count:', orders.length);
			return {
				content: [
					{
						type: 'text',
						text:
							`Found ${orders.length} orders:\n\n` +
							orders
								.map(
									(order) =>
										`• Order #${order.order_number} (ID: ${order.id})\n` +
										`  Customer: ${(order.customer && order.customer.first_name) || 'Guest'} ${(order.customer && order.customer.last_name) || ''}\n` +
										`  Total: ${order.total_price} ${order.currency}\n` +
										`  Items: ${order.line_items.length}\n` +
										`  Payment: ${order.financial_status}\n` +
										`  Fulfillment: ${order.fulfillment_status || 'unfulfilled'}\n` +
										`  Date: ${new Date(order.created_at).toLocaleDateString()}`
								)
								.join('\n\n'),
					},
				],
				structuredContent: { orders },
			};
		}

		// Filter by customer name substring
		if (args.customer_name) {
			const needle = String(args.customer_name).toLowerCase();
			orders = orders.filter((order) => {
				const first = order.customer && order.customer.first_name;
				const last = order.customer && order.customer.last_name;
				const full = [first, last].filter(Boolean).join(' ').toLowerCase();
				return full.includes(needle);
			});
		}

		// Respect limit after filtering
		if (args.limit) {
			orders = orders.slice(0, args.limit);
		}

		console.error('[mcp] list_orders final count:', orders.length);

		return {
			content: [
				{
					type: 'text',
					text:
						`Found ${orders.length} orders:\n\n` +
						orders
							.map(
								(order) =>
									`• Order #${order.order_number} (ID: ${order.id})\n` +
									`  Customer: ${(order.customer && order.customer.first_name) || 'Guest'} ${(order.customer && order.customer.last_name) || ''}\n` +
									`  Total: ${order.total_price} ${order.currency}\n` +
									`  Items: ${order.line_items.length}\n` +
									`  Payment: ${order.financial_status}\n` +
									`  Fulfillment: ${order.fulfillment_status || 'unfulfilled'}\n` +
									`  Date: ${new Date(order.created_at).toLocaleDateString()}`
							)
							.join('\n\n'),
				},
			],
			structuredContent: { orders },
		};
	}

	async createOrder(args = {}) {
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
			line_items: args.line_items.map(sanitizeLineItem),
		};

		if (args.email) orderPayload.email = args.email;
		if (args.shipping_address) orderPayload.shipping_address = args.shipping_address;
		if (args.billing_address) orderPayload.billing_address = args.billing_address;
		if (args.note) orderPayload.note = args.note;
		if (args.tags) orderPayload.tags = args.tags;
		if (args.financial_status) orderPayload.financial_status = args.financial_status;
		if (args.fulfillment_status) orderPayload.fulfillment_status = args.fulfillment_status;
		if (args.test !== undefined) orderPayload.test = !!args.test;

		const data = await this.shopifyRequest('orders.json', {
			method: 'POST',
			body: JSON.stringify({ order: orderPayload }),
		});

		const order = data && data.order ? data.order : null;

		return {
			content: [
				{
					type: 'text',
					text: order
						? `Created order ${order.name || order.id}\nTotal: ${order.total_price || 'N/A'} ${order.currency || ''}`
						: 'Created order.',
				},
			],
			structuredContent: order ? { order } : undefined,
		};
	}

	async fulfillOrder(args = {}) {
		if (!args.order_id) {
			throw new Error('order_id is required');
		}

		throw new Error('fulfill_order tool removed');
	}

	async updateOrder(args = {}) {
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

		const data = await this.shopifyRequest(`orders/${orderId}.json`, {
			method: 'PUT',
			body: JSON.stringify({ order: payload }),
		});

		const order = data && data.order ? data.order : null;

		return {
			content: [
				{
					type: 'text',
					text: order
						? `Updated order ${order.name || order.id}`
						: `Order ${orderId} updated.`,
				},
			],
			structuredContent: order ? { order } : undefined,
		};
	}

	async getOrder(args) {
		const data = await this.shopifyRequest(`orders/${args.order_id}.json`);
		const order = data.order;

		return {
			content: [
				{
					type: 'text',
					text:
						`Order #${order.order_number}\n` +
						`ID: ${order.id}\n` +
						`Status: ${order.financial_status} / ${order.fulfillment_status || 'unfulfilled'}\n` +
						`Customer: ${(order.customer && order.customer.first_name) || 'Guest'} ${(order.customer && order.customer.last_name) || ''} (${order.email})\n` +
						`Total: ${order.total_price} ${order.currency}\n` +
						`Subtotal: ${order.subtotal_price}\n` +
						`Tax: ${order.total_tax}\n` +
						`Shipping: ${order.shipping_lines.map((s) => s.price).reduce((a, b) => a + parseFloat(b), 0)}\n` +
						`Created: ${new Date(order.created_at).toLocaleDateString()}\n` +
						`\nItems (${order.line_items.length}):\n` +
						order.line_items
							.map(
								(item) => `  - ${item.title} x${item.quantity} @ ${item.price} each`
							)
							.join('\n') +
						`\n\nShipping Address:\n` +
						(order.shipping_address
							? `  ${order.shipping_address.name}\n` +
								`  ${order.shipping_address.address1}\n` +
								`  ${order.shipping_address.city}, ${order.shipping_address.province_code} ${order.shipping_address.zip}\n` +
								`  ${order.shipping_address.country}`
							: 'N/A'),
				},
			],
		};
	}

	async getOrderTransactions(args) {
		const data = await this.shopifyRequest(`orders/${args.order_id}/transactions.json`);

		return {
			content: [
				{
					type: 'text',
					text:
						`Transactions for Order ${args.order_id}:\n\n` +
						data.transactions
							.map(
								(t) =>
									`• ${t.kind} - ${t.status}\n` +
									`  Amount: ${t.amount} ${t.currency}\n` +
									`  Gateway: ${t.gateway}\n` +
									`  Date: ${new Date(t.created_at).toLocaleDateString()}\n` +
									`  ID: ${t.id}`
							)
							.join('\n\n'),
				},
			],
		};
	}

	// Customer Management Tools
	async listCustomers(args = {}) {
		const params = new URLSearchParams();
		if (args.limit) params.append('limit', args.limit);
		if (args.created_at_min) params.append('created_at_min', args.created_at_min);
		if (args.created_at_max) params.append('created_at_max', args.created_at_max);

		const data = await this.shopifyRequest(`customers.json?${params}`);

		return {
			content: [
				{
					type: 'text',
					text:
						`Found ${data.customers.length} customers:\n\n` +
						data.customers
							.map(
								(customer) =>
									`• ${customer.first_name} ${customer.last_name} (ID: ${customer.id})\n` +
									`  Email: ${customer.email}\n` +
									`  Phone: ${customer.phone || 'N/A'}\n` +
									`  Orders: ${customer.orders_count}\n` +
									`  Total Spent: ${customer.total_spent} ${customer.currency || ''}\n` +
									`  Created: ${new Date(customer.created_at).toLocaleDateString()}`
							)
							.join('\n\n'),
				},
			],
		};
	}

	async getCustomer(args) {
		const data = await this.shopifyRequest(`customers/${args.customer_id}.json`);
		const customer = data.customer;

		return {
			content: [
				{
					type: 'text',
					text:
						`Customer: ${customer.first_name} ${customer.last_name}\n` +
						`ID: ${customer.id}\n` +
						`Email: ${customer.email}\n` +
						`Phone: ${customer.phone || 'N/A'}\n` +
						`State: ${customer.state}\n` +
						`Orders: ${customer.orders_count}\n` +
						`Total Spent: ${customer.total_spent} ${customer.currency || ''}\n` +
						`Average Order: ${customer.orders_count > 0 ? (parseFloat(customer.total_spent) / customer.orders_count).toFixed(2) : '0'}\n` +
						`Tags: ${customer.tags}\n` +
						`Marketing: ${customer.accepts_marketing ? 'Yes' : 'No'}\n` +
						`Created: ${new Date(customer.created_at).toLocaleDateString()}\n` +
						`Last Order: ${customer.last_order_id ? new Date(customer.updated_at).toLocaleDateString() : 'N/A'}`,
				},
			],
		};
	}

	async searchCustomers(args) {
		const data = await this.shopifyRequest(
			`customers/search.json?query=${encodeURIComponent(args.query)}&limit=${args.limit || 10}`
		);

		return {
			content: [
				{
					type: 'text',
					text:
						`Found ${data.customers.length} customers matching "${args.query}":\n\n` +
						data.customers
							.map(
								(customer) =>
									`• ${customer.first_name} ${customer.last_name}\n` +
									`  Email: ${customer.email}\n` +
									`  Orders: ${customer.orders_count}\n` +
									`  Total Spent: ${customer.total_spent}`
							)
							.join('\n\n'),
				},
			],
		};
	}

	async getCustomerOrders(args) {
		const data = await this.shopifyRequest(
			`customers/${args.customer_id}/orders.json?limit=${args.limit || 10}`
		);

		return {
			content: [
				{
					type: 'text',
					text:
						`Orders for Customer ${args.customer_id} (${data.orders.length} orders):\n\n` +
						data.orders
							.map(
								(order) =>
									`• Order #${order.order_number}\n` +
									`  Total: ${order.total_price} ${order.currency}\n` +
									`  Status: ${order.financial_status} / ${order.fulfillment_status || 'unfulfilled'}\n` +
									`  Date: ${new Date(order.created_at).toLocaleDateString()}`
							)
							.join('\n\n'),
				},
			],
		};
	}

	// Analytics & Reports Tools
	async getShopInfo() {
		const data = await this.shopifyRequest('shop.json');
		const shop = data.shop;

		return {
			content: [
				{
					type: 'text',
					text:
						`Shop Information:\n\n` +
						`Name: ${shop.name}\n` +
						`Domain: ${shop.domain}\n` +
						`Email: ${shop.email}\n` +
						`Currency: ${shop.currency}\n` +
						`Money Format: ${shop.money_format}\n` +
						`Country: ${shop.country_name}\n` +
						`Timezone: ${shop.iana_timezone}\n` +
						`Plan: ${shop.plan_name}\n` +
						`Created: ${new Date(shop.created_at).toLocaleDateString()}\n` +
						`Password Enabled: ${shop.password_enabled ? 'Yes' : 'No'}\n` +
						`Tax Shipping: ${shop.tax_shipping ? 'Yes' : 'No'}\n` +
						`Taxes Included: ${shop.taxes_included ? 'Yes' : 'No'}`,
				},
			],
		};
	}

	async getSalesSummary(args = {}) {
		const params = new URLSearchParams();
		params.append('status', 'any');
		params.append('limit', '250');
		if (args.date_from) params.append('created_at_min', args.date_from);
		if (args.date_to) params.append('created_at_max', args.date_to);

		const data = await this.shopifyRequest(`orders.json?${params}`);

		// Calculate summary statistics
		let totalRevenue = 0;
		let totalOrders = 0;
		let totalItems = 0;
		const dailySales = {};
		const productSales = {};

		data.orders.forEach((order) => {
			if (order.financial_status === 'paid') {
				totalRevenue += parseFloat(order.total_price);
				totalOrders++;

				const date = new Date(order.created_at).toLocaleDateString();
				dailySales[date] = (dailySales[date] || 0) + parseFloat(order.total_price);

				order.line_items.forEach((item) => {
					totalItems += item.quantity;
					if (!productSales[item.product_id]) {
						productSales[item.product_id] = {
							title: item.title,
							quantity: 0,
							revenue: 0,
						};
					}
					productSales[item.product_id].quantity += item.quantity;
					productSales[item.product_id].revenue += parseFloat(item.price) * item.quantity;
				});
			}
		});

		const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0';
		const topProducts = Object.entries(productSales)
			.sort((a, b) => b[1].revenue - a[1].revenue)
			.slice(0, 5);

		return {
			content: [
				{
					type: 'text',
					text:
						`Sales Summary:\n\n` +
						`Period: ${args.date_from || 'All time'} to ${args.date_to || 'Present'}\n` +
						`Total Revenue: ${totalRevenue.toFixed(2)} ${shop.currency || ''}\n` +
						`Total Orders: ${totalOrders}\n` +
						`Total Items Sold: ${totalItems}\n` +
						`Average Order Value: ${avgOrderValue} ${shop.currency || ''}\n` +
						`\nTop 5 Products by Revenue:\n` +
						topProducts
							.map(
								([, data], i) =>
									`${i + 1}. ${data.title}\n   Revenue: ${data.revenue.toFixed(2)} (${data.quantity} units)`
							)
							.join('\n\n'),
				},
			],
		};
	}

	async getBestSellers(args = {}) {
		const days = args.days || 30;
		const limit = args.limit || 10;
		const dateFrom = new Date();
		dateFrom.setDate(dateFrom.getDate() - days);

		const params = new URLSearchParams();
		params.append('status', 'any');
		params.append('limit', '250');
		params.append('created_at_min', dateFrom.toISOString());

		const data = await this.shopifyRequest(`orders.json?${params}`);

		// Aggregate product sales
		const productSales = {};
		let totalItemsSold = 0;

		data.orders.forEach((order) => {
			if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
				order.line_items.forEach((item) => {
					const key = `${item.product_id}_${item.variant_id}`;
					if (!productSales[key]) {
						productSales[key] = {
							product_id: item.product_id,
							variant_id: item.variant_id,
							title: item.title,
							variant_title: item.variant_title,
							quantity: 0,
							revenue: 0,
							sku: item.sku,
						};
					}
					productSales[key].quantity += item.quantity;
					productSales[key].revenue += parseFloat(item.price) * item.quantity;
					totalItemsSold += item.quantity;
				});
			}
		});

		const sortedProducts = Object.values(productSales)
			.sort((a, b) => b.quantity - a.quantity)
			.slice(0, limit);

		return {
			content: [
				{
					type: 'text',
					text:
						`Best Sellers (Last ${days} days):\n\n` +
						sortedProducts
							.map(
								(product, i) =>
									`${i + 1}. ${product.title}${product.variant_title ? ` - ${product.variant_title}` : ''}\n` +
									`   Quantity: ${product.quantity} units (${((product.quantity / totalItemsSold) * 100).toFixed(1)}% of sales)\n` +
									`   Revenue: ${product.revenue.toFixed(2)}\n` +
									`   SKU: ${product.sku || 'N/A'}`
							)
							.join('\n\n') +
						`\n\nTotal items sold in period: ${totalItemsSold}`,
				},
			],
		};
	}

	async getLocations() {
		const data = await this.shopifyRequest('locations.json');

		return {
			content: [
				{
					type: 'text',
					text:
						`Shop Locations (${data.locations.length}):\n\n` +
						data.locations
							.map(
								(location) =>
									`• ${location.name} (ID: ${location.id})\n` +
									`  Active: ${location.active ? 'Yes' : 'No'}\n` +
									`  Address: ${location.address1}, ${location.city}\n` +
									`  ${location.province}, ${location.country} ${location.zip}\n` +
									`  Phone: ${location.phone || 'N/A'}`
							)
							.join('\n\n'),
				},
			],
			structuredContent: { locations: data.locations },
		};
	}

	// Collections Tools
	async listCollections(args = {}) {
		let collections = [];

		// Get custom collections
		const customData = await this.shopifyRequest(
			`custom_collections.json?limit=${args.limit || 10}`
		);
		collections = collections.concat(
			customData.custom_collections.map((c) => ({ ...c, type: 'custom' }))
		);

		// Get smart collections
		const smartData = await this.shopifyRequest(
			`smart_collections.json?limit=${args.limit || 10}`
		);
		collections = collections.concat(
			smartData.smart_collections.map((c) => ({ ...c, type: 'smart' }))
		);

		// Filter by type if specified
		if (args.collection_type) {
			collections = collections.filter((c) => c.type === args.collection_type);
		}

		return {
			content: [
				{
					type: 'text',
					text:
						`Collections (${collections.length}):\n\n` +
						collections
							.map(
								(collection) =>
									`• ${collection.title} (ID: ${collection.id})\n` +
									`  Type: ${collection.type}\n` +
									`  Handle: ${collection.handle}\n` +
									`  Published: ${collection.published_at ? 'Yes' : 'No'}\n` +
									`  Sort Order: ${collection.sort_order || 'manual'}`
							)
							.join('\n\n'),
				},
			],
		};
	}

	async getCollectionProducts(args) {
		const data = await this.shopifyRequest(
			`collections/${args.collection_id}/products.json?limit=${args.limit || 10}`
		);

		return {
			content: [
				{
					type: 'text',
					text:
						`Products in Collection ${args.collection_id} (${data.products.length}):\n\n` +
						data.products
							.map(
								(product) =>
									`• ${product.title}\n` +
									`  Type: ${product.product_type || 'N/A'}\n` +
									`  Vendor: ${product.vendor}\n` +
									`  Price: ${(product.variants[0] && product.variants[0].price) || 'N/A'}`
							)
							.join('\n\n'),
				},
			],
		};
	}

	// Discount Tools
	async listDiscounts(args = {}) {
		const data = await this.shopifyRequest(`price_rules.json?limit=${args.limit || 10}`);

		return {
			content: [
				{
					type: 'text',
					text:
						`Discounts/Price Rules (${data.price_rules.length}):\n\n` +
						data.price_rules
							.map(
								(rule) =>
									`• ${rule.title} (ID: ${rule.id})\n` +
									`  Type: ${rule.value_type} ${rule.value}\n` +
									`  Target: ${rule.target_type} (${rule.target_selection})\n` +
									`  Usage Limit: ${rule.usage_limit || 'Unlimited'}\n` +
									`  Active: ${new Date() >= new Date(rule.starts_at) && (!rule.ends_at || new Date() <= new Date(rule.ends_at)) ? 'Yes' : 'No'}`
							)
							.join('\n\n'),
				},
			],
		};
	}

	async getDiscount(args) {
		const data = await this.shopifyRequest(`price_rules/${args.discount_id}.json`);
		const rule = data.price_rule;

		// Get associated discount codes
		const codesData = await this.shopifyRequest(
			`price_rules/${args.discount_id}/discount_codes.json`
		);

		return {
			content: [
				{
					type: 'text',
					text:
						`Discount: ${rule.title}\n` +
						`ID: ${rule.id}\n` +
						`Value: ${rule.value_type === 'percentage' ? `${rule.value}%` : `${rule.value} ${rule.currency}`}\n` +
						`Target: ${rule.target_type} (${rule.target_selection})\n` +
						`Customer Selection: ${rule.customer_selection}\n` +
						`Usage Limit: ${rule.usage_limit || 'Unlimited'}\n` +
						`Once Per Customer: ${rule.once_per_customer ? 'Yes' : 'No'}\n` +
						`Starts: ${new Date(rule.starts_at).toLocaleDateString()}\n` +
						`Ends: ${rule.ends_at ? new Date(rule.ends_at).toLocaleDateString() : 'Never'}\n` +
						`\nDiscount Codes:\n` +
						codesData.discount_codes
							.map((code) => `  - ${code.code} (Uses: ${code.usage_count})`)
							.join('\n'),
				},
			],
		};
	}

	// Metafields Tools
	async getProductMetafields(args) {
		const data = await this.shopifyRequest(`products/${args.product_id}/metafields.json`);

		if (data.metafields.length === 0) {
			return {
				content: [
					{
						type: 'text',
						text: `No metafields found for product ${args.product_id}`,
					},
				],
			};
		}

		return {
			content: [
				{
					type: 'text',
					text:
						`Metafields for Product ${args.product_id}:\n\n` +
						data.metafields
							.map(
								(field) =>
									`• ${field.namespace}.${field.key}\n` +
									`  Type: ${field.type}\n` +
									`  Value: ${JSON.stringify(field.value)}\n` +
									`  Updated: ${new Date(field.updated_at).toLocaleDateString()}`
							)
							.join('\n\n'),
				},
			],
		};
	}

	// Fulfillment Tools
	async listFulfillmentServices() {
		const data = await this.shopifyRequest('fulfillment_services.json');

		return {
			content: [
				{
					type: 'text',
					text:
						`Fulfillment Services (${data.fulfillment_services.length}):\n\n` +
						data.fulfillment_services
							.map(
								(service) =>
									`• ${service.name} (ID: ${service.id})\n` +
									`  Handle: ${service.handle}\n` +
									`  Tracking Support: ${service.tracking_support ? 'Yes' : 'No'}\n` +
									`  Inventory Management: ${service.inventory_management ? 'Yes' : 'No'}`
							)
							.join('\n\n'),
				},
			],
		};
	}

	async getShippingZones() {
		const data = await this.shopifyRequest('shipping_zones.json');

		return {
			content: [
				{
					type: 'text',
					text:
						`Shipping Zones (${data.shipping_zones.length}):\n\n` +
						data.shipping_zones
							.map(
								(zone) =>
									`• ${zone.name} (ID: ${zone.id})\n` +
									`  Countries: ${zone.countries.map((c) => c.name).join(', ')}\n` +
									`  Weight Based Rates: ${zone.weight_based_shipping_rates.length}\n` +
									`  Price Based Rates: ${zone.price_based_shipping_rates.length}\n` +
									`  Carrier Rates: ${zone.carrier_shipping_rate_providers.length}`
							)
							.join('\n\n'),
				},
			],
		};
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error('MCP Shopify server running on stdio');
		// Keep process alive to serve stdio requests
		setInterval(() => {}, 1 << 30);
	}
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
	process.on('exit', (code) => {
		console.error('[mcp-server] process exit', code);
	});
	process.on('uncaughtException', (err) => {
		console.error('[mcp-server] uncaughtException', err);
	});
	process.on('unhandledRejection', (reason) => {
		console.error('[mcp-server] unhandledRejection', reason);
	});
	const server = new ShopifyMCPServer();
	server.run().catch(console.error);
}

export { ShopifyMCPServer };
export default ShopifyMCPServer;
