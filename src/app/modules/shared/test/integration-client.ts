interface TestEnv
{
	E2E_API_URL?: string;
	E2E_API_BASE?: string;
	E2E_USER?: string;
	E2E_PASS?: string;
}

const testEnv: TestEnv = (globalThis as any).process?.env ?? {};
export const INTEGRATION_HOST = testEnv.E2E_API_URL || 'http://127.0.0.205';
export const INTEGRATION_API_BASE = testEnv.E2E_API_BASE || (INTEGRATION_HOST + '/PointOfSale');
export const INTEGRATION_USER = testEnv.E2E_USER || 'nextor@gmail.com';
export const INTEGRATION_PASS = testEnv.E2E_PASS || 'sdfgsdfggggggg';

export function integrationApiOverride(): { domain: string; urlBase: string }
{
	if (!testEnv.E2E_API_BASE)
	{
		return { domain: '', urlBase: '' };
	}

	try
	{
		const url = new URL(INTEGRATION_API_BASE);
		return { domain: url.origin, urlBase: url.pathname.replace(/^\/+/, '').replace(/\/+$/, '') };
	}
	catch
	{
		return { domain: '', urlBase: '' };
	}
}

export interface IntegrationSession
{
	bearer: string;
	user: any;
	user_permission: any;
}

export async function apiRequest(path: string, options: any = {}): Promise<any>
{
	const headers: any = {
		accept: 'application/json, text/plain, */*'
	};

	if (options.body !== undefined)
	{
		headers['content-type'] = 'application/json';
	}

	if (options.bearer)
	{
		headers.Authorization = 'Bearer ' + options.bearer;
	}

	const response = await fetch(INTEGRATION_API_BASE + path, {
		method: options.method || 'GET',
		headers,
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
		mode: 'cors',
		credentials: 'omit',
		cache: 'no-store'
	});

	const text = await response.text();
	let data: any = {};

	if (text.trim() !== '')
	{
		try
		{
			data = JSON.parse(text);
		}
		catch
		{
			throw new Error(path + ' returned non-JSON content: ' + text.trim().slice(0, 120));
		}
	}

	if (!response.ok)
	{
		const message = data && (data.error || data.message);
		throw new Error(
			(options.method || 'GET') + ' ' + path + ' failed with HTTP ' + response.status
			+ (message ? ': ' + message : '')
			+ ' body: ' + text.trim().slice(0, 200)
		);
	}

	return data;
}

export async function integrationLogin(username: string = INTEGRATION_USER, password: string = INTEGRATION_PASS): Promise<IntegrationSession>
{
	const data = await apiRequest('/login.php', {
		method: 'POST',
		body: { username, password }
	});

	if (!data.session || !data.session.id || !data.user || !data.user.id)
	{
		throw new Error('Login response did not include session.id and user.id: ' + JSON.stringify(data));
	}

	return { bearer: data.session.id, user: data.user, user_permission: data.user_permission };
}

export async function pingBackend(): Promise<boolean>
{
	try
	{
		const response = await fetch(INTEGRATION_API_BASE + '/store.php', {
			mode: 'cors',
			credentials: 'omit',
			cache: 'no-store'
		});
		return response.ok;
	}
	catch
	{
		return false;
	}
}

export async function grantConsignmentPermissions(bearer: string, userId: number): Promise<void>
{
	await apiRequest('/user_permission.php', {
		method: 'PUT',
		bearer,
		body: {
			user_id: userId,
			add_consignment_received: true,
			add_consignment_delivered: true,
			view_consignment_received: true,
			view_consignment_delivered: true
		}
	});
}

export async function grantStocktakePermissions(bearer: string, userId: number): Promise<void>
{
	await apiRequest('/user_permission.php', {
		method: 'PUT',
		bearer,
		body: {
			user_id: userId,
			stocktake: true,
			add_stock: true,
			global_add_stock: true,
			view_global_stocktake: true,
			view_stock: true
		}
	});
}

export async function createStocktake(bearer: string, storeId: number, name: string, stockAdjustment: string = 'DIFFERENCE'): Promise<any>
{
	const data = await apiRequest('/stocktake.php', {
		method: 'POST',
		bearer,
		body: {
			store_id: storeId,
			name,
			status: 'ACTIVE',
			stock_adjustment: stockAdjustment
		}
	});

	if (!data.id)
	{
		throw new Error('Stocktake creation did not return id: ' + JSON.stringify(data));
	}

	return data;
}

export async function closeStocktake(bearer: string, stocktakeId: number, stockAdjustment: string = 'DIFFERENCE'): Promise<any>
{
	return apiRequest('/stocktake.php', {
		method: 'PUT',
		bearer,
		body: {
			id: stocktakeId,
			status: 'CLOSED',
			stock_adjustment: stockAdjustment
		}
	});
}

export async function fetchStocktakeScans(bearer: string, stocktakeId: number): Promise<any>
{
	return apiRequest('/stocktake_scan.php?stocktake_id=' + stocktakeId + '&limit=9999', { bearer });
}

export async function fetchStocktakeItems(bearer: string, stocktakeId: number): Promise<any>
{
	return apiRequest('/stocktake_item.php?stocktake_id=' + stocktakeId + '&limit=9999', { bearer });
}

export async function fetchStocktakeItemBatches(bearer: string, stocktakeItemId: number): Promise<any>
{
	return apiRequest('/stocktake_item_batch.php?stocktake_item_id=' + stocktakeItemId + '&limit=9999', { bearer });
}

export async function fetchCurrentBatchRecord(bearer: string, itemId: number, storeId: number, batch: string): Promise<any>
{
	return apiRequest(
		'/batch_record.php?item_id=' + itemId + '&store_id=' + storeId + '&batch=' + encodeURIComponent(batch) + '&is_current=1&limit=1',
		{ bearer }
	);
}

export function seedSession(session: IntegrationSession): void
{
	localStorage.setItem('user', JSON.stringify(session.user));
	localStorage.setItem('user_permission', JSON.stringify(session.user_permission));
	localStorage.setItem('session_token', session.bearer);
}

export function uniqueName(prefix: string): string
{
	return prefix + ' ' + Date.now() + ' ' + Math.floor(Math.random() * 100000);
}

export function uniqueBatch(prefix: string = 'LOT'): string
{
	return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

export async function createBatchItem(bearer: string, name: string, batchOption: string = 'BATCH_AND_EXPIRATION'): Promise<any>
{
	const created = await apiRequest('/item_info.php', {
		method: 'POST',
		bearer,
		body: {
			item: {
				applicable_tax: 'DEFAULT',
				availability_type: 'ON_STOCK',
				batch_option: batchOption,
				clave_sat: '53111603',
				currency_id: 'MXN',
				name,
				note_required: 'NO',
				on_sale: 'YES',
				reference_price: 0,
				status: 'ACTIVE',
				tax_percent: 0,
				unidad_medida_sat_id: 'H87'
			}
		}
	});

	if (!created.item || !created.item.id)
	{
		throw new Error('Item creation did not return item.id: ' + JSON.stringify(created));
	}

	return created.item;
}

export async function addBatchStock(bearer: string, itemId: number, storeId: number, batch: string, expirationDate: string, qty: number): Promise<any>
{
	return apiRequest('/updates/stock_add.php', {
		method: 'POST',
		bearer,
		body: {
			item_id: itemId,
			store_id: storeId,
			qty,
			comment: 'Integration test batch stock',
			batch,
			expiration_date: expirationDate
		}
	});
}

export async function createConsignmentReceived(
	bearer: string,
	storeId: number,
	providerUserId: number,
	itemId: number,
	qty: number,
	unitaryCost: number,
	reference: string
): Promise<{ id: number; consignmentReceivedItemId: number }>
{
	const data = await apiRequest('/consignment_received_info.php', {
		method: 'POST',
		bearer,
		body: {
			consignment_received: {
				provider_user_id: providerUserId,
				store_id: storeId,
				reference
			},
			items: [
				{
					consignment_received_item: {
						item_id: itemId,
						qty,
						unitary_cost: unitaryCost
					}
				}
			]
		}
	});

	const id = data.consignment_received && data.consignment_received.id;
	const item = data.items && data.items[0] && data.items[0].consignment_received_item;

	if (!id || !item || !item.id)
	{
		throw new Error('Consignment received creation did not return expected ids: ' + JSON.stringify(data));
	}

	return { id, consignmentReceivedItemId: item.id };
}

export async function createConsignmentDelivered(
	bearer: string,
	storeId: number,
	sellerUserId: number,
	itemId: number,
	qty: number,
	unitaryPrice: number,
	batches: any[]
): Promise<{ id: number; consignmentDeliveredItemId: number }>
{
	const data = await apiRequest('/consignment_delivered_info.php', {
		method: 'POST',
		bearer,
		body: {
			consignment_delivered: {
				seller_user_id: sellerUserId,
				store_id: storeId
			},
			items: [
				{
					consignment_delivered_item: {
						item_id: itemId,
						qty,
						unitary_price: unitaryPrice
					},
					consignment_delivered_item_batches: batches
				}
			]
		}
	});

	const id = data.consignment_delivered && data.consignment_delivered.id;
	const item = data.items && data.items[0] && data.items[0].consignment_delivered_item;

	if (!id || !item || !item.id)
	{
		throw new Error('Consignment delivered creation did not return expected ids: ' + JSON.stringify(data));
	}

	return { id, consignmentDeliveredItemId: item.id };
}

export async function fetchReceivedInfo(bearer: string, id: number): Promise<any>
{
	return apiRequest('/consignment_received_info.php?id=' + id, { bearer });
}

export async function fetchDeliveredInfo(bearer: string, id: number): Promise<any>
{
	return apiRequest('/consignment_delivered_info.php?id=' + id, { bearer });
}

export async function waitFor(condition: () => boolean, timeoutMs: number = 20000, intervalMs: number = 60): Promise<void>
{
	const start = Date.now();

	while (!condition())
	{
		if (Date.now() - start > timeoutMs)
		{
			throw new Error('waitFor timed out after ' + timeoutMs + 'ms');
		}
		await new Promise(resolve => setTimeout(resolve, intervalMs));
	}
}
