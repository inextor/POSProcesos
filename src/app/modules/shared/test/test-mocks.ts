import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { RestService } from '../services/rest.service';
import { GetEmpty } from '../GetEmpty';

export function createRestInstanceMock(overrides: Record<string, any> = {}): any
{
	return {
		get: () => of(null),
		search: () => of({ data: [] }),
		getAll: () => of({ data: [] }),
		update: () => of({}),
		getRelation: () => ({}),
		getSearchObject: () => ({}),
		searchWithRelations: () => of({ data: [] }),
		getEmptySearch: () => ({
			eq: {},
			le: {},
			lt: {},
			ge: {},
			gt: {},
			lk: {},
			nn: [],
			sort_order: [],
			start: {},
			ends: {},
			csv: {},
			different: {},
			is_null: [],
			search_extra: {},
			page: 0,
			limit: 50
		}),
		...overrides
	};
}

export function createRestMock(overrides: Record<string, any> = {}): any
{
	const rest: any = {
		user_permission: GetEmpty.user_permission(),
		preferences: GetEmpty.preferences(),
		user: null,
		has_hades: false,
		show_menu: false,
		is_offline: false,
		notification: of({}),
		errorObservable: of(null),
		updates: of(null),
		initRestSimple: () => createRestInstanceMock(),
		initRest: () => createRestInstanceMock(),
		initRestPlatform: () => createRestInstanceMock(),
		update: () => of({}),
		updatePath: () => of({}),
		reservationUpdates: () => of({}),
		httpPost: () => of({}),
		getReportByPath: () => of({ data: [] }),
		getReport: () => of({ data: [] }),
		replayFactura: () => of({}),
		getPriceTypes: () => of({ data: [] }),
		getPreferencesInfo: () => Promise.resolve(GetEmpty.preferences()),
		getApiUrl: () => '',
		getApiPath: () => '',
		getExternalAppUrl: () => '',
		getUrlSafe: (value: any) => value,
		getFilePath: () => '',
		getImagePath: () => '',
		getPlatformImagePath: () => '',
		getLoginLogo: () => '',
		getSessionHeaders: () => ({ get: () => null }),
		getSessionStart: () => new Date(),
		getSyncId: () => 'test',
		getVersion: () => '',
		showError: jasmine.createSpy('showError'),
		showSuccess: jasmine.createSpy('showSuccess'),
		showWarning: jasmine.createSpy('showWarning'),
		showErrorMessage: jasmine.createSpy('showErrorMessage'),
		hideMenu: jasmine.createSpy('hideMenu'),
		toggleMenu: jasmine.createSpy('toggleMenu'),
		enableHades: jasmine.createSpy('enableHades'),
		sendNotification: jasmine.createSpy('sendNotification'),
		logout: jasmine.createSpy('logout'),
		getClientPlatformFromSession: () => null,
		normalizarOrderItems: (list: any[]) => list,
		createStructuredItems: (order: any) => order,
		callPostApi: () => of({}),
		...overrides
	};
	return rest;
}

export function createActivatedRouteMock(params: Record<string, string> = {}): any
{
	const paramMap = {
		keys: Object.keys(params),
		get: (key: string) => (key in params ? params[key] : null),
		getAll: () => [] as string[],
		has: (key: string) => key in params
	};

	return {
		paramMap: of(paramMap),
		queryParamMap: of({ keys: [], get: () => null, getAll: () => [], has: () => false }),
		snapshot: { params, paramMap, queryParamMap: paramMap }
	};
}

export function createRouterMock(): any
{
	return {
		navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
		navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true)),
		createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({}),
		serializeUrl: jasmine.createSpy('serializeUrl').and.returnValue(''),
		parseUrl: jasmine.createSpy('parseUrl').and.returnValue({}),
		isActive: jasmine.createSpy('isActive').and.returnValue(false),
		events: of(null),
		url: '/'
	};
}

export function provideComponentMocks(options: {
	rest?: any;
	routeParams?: Record<string, string>;
} = {}): any[]
{
	return [
		{ provide: RestService, useValue: options.rest ?? createRestMock() },
		{ provide: ActivatedRoute, useValue: createActivatedRouteMock(options.routeParams) },
		{ provide: Router, useValue: createRouterMock() },
		{
			provide: Location,
			useValue: {
				back: jasmine.createSpy('back'),
				forward: jasmine.createSpy('forward'),
				replaceState: jasmine.createSpy('replaceState'),
				historyGo: jasmine.createSpy('historyGo')
			}
		},
		{ provide: Title, useValue: { setTitle: jasmine.createSpy('setTitle') } }
	];
}
