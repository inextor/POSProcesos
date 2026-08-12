#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(await readFile(join(root, 'e2e', 'doc-modules.json'), 'utf8'));

const cmd = process.argv[2];
const rest = process.argv.slice(3);

function slugify(text)
{
	return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function usage()
{
	console.log(`
Módulos E2E disponibles:
${Object.entries(registry).map(([key, m]) => `  ${key.padEnd(12)} ${m.title}`).join('\n')}

Uso:
  npm run list-test                                   Lista los módulos y sus specs
  npm run test <modulo> <host>                        Corre los tests E2E de un módulo
  npm run test all <host>                             Corre todos los tests E2E
  npm run testall <host>                              Corre todos los tests E2E
  npm run generate-doc <modulo> <host>                Genera el doc HTML del módulo
  npm run generate-docs all <host>                    Genera todos los docs HTML

Ejemplos:
  npm run test stocktake 127.0.0.205
  npm run test all 127.0.0.205
  npm run generate-doc stocktake 127.0.0.205
  npm run generate-docs all 127.0.0.205

Para correr sin ventana (headless): E2E_HEADLESS=1 npm run test stocktake 127.0.0.205
`);
}

function requireHost(host)
{
	if (!host)
	{
		console.error('Falta el parámetro host/ip.');
		usage();
		process.exit(1);
	}
	return host;
}

function buildEnv(host)
{
	host = requireHost(host);
	const isIntegranet = host.includes('integranet.xyz');

	return {
		E2E_API_URL: isIntegranet ? `https://${host}` : `http://${host}`,
		E2E_API_BASE: isIntegranet ? `https://${host}/api` : `http://${host}/PointOfSale`,
		E2E_APP_URL: process.env.E2E_APP_URL || 'http://127.0.0.205:4001',
		E2E_HEADLESS: process.env.E2E_HEADLESS || '0'
	};
}

function runPlaywright(args, host)
{
	const env = buildEnv(host);
	console.log(`\n>>> Probando contra ${env.E2E_API_URL} (${env.E2E_API_BASE})\n`);
	const res = spawnSync('npx', ['playwright', 'test', ...args], { cwd: root, env: { ...process.env, ...env }, stdio: 'inherit' });
	return res.status ?? 1;
}

function runNode(args)
{
	const res = spawnSync('node', args, { cwd: root, stdio: 'inherit' });
	return res.status ?? 1;
}

function printDocs()
{
	for (const [, m] of Object.entries(registry))
	{
		console.log(`  ${join(root, 'docs', slugify(m.title) + '.html')}`);
	}
}

if (cmd === 'list')
{
	console.log('\nMódulos E2E disponibles:');
	for (const [key, m] of Object.entries(registry))
	{
		console.log(`\n  ${key}  —  ${m.title}`);
		console.log(`      tests:       ${m.tests.join(', ')}`);
		console.log(`      walkthrough: ${m.walkthrough}`);
	}
	usage();
	process.exit(0);
}

if (cmd === 'test')
{
	// Sin módulo (o con flags de karma) => tests unitarios con ng test
	if (rest.length === 0 || rest[0].startsWith('-'))
	{
		const res = spawnSync('npx', ['ng', 'test', ...rest], { cwd: root, stdio: 'inherit' });
		process.exit(res.status ?? 1);
	}

	const [module, host] = rest;

	if (module === 'all')
	{
		process.exit(runPlaywright([], host));
	}

	if (!registry[module])
	{
		console.error(`Módulo desconocido: "${module}".`);
		usage();
		process.exit(1);
	}

	process.exit(runPlaywright(registry[module].tests, host));
}

if (cmd === 'testall')
{
	process.exit(runPlaywright([], rest[0]));
}

if (cmd === 'doc')
{
	const [module, host] = rest;

	if (!registry[module])
	{
		console.error(`Módulo desconocido: "${module}".`);
		usage();
		process.exit(1);
	}

	let code = runPlaywright([registry[module].walkthrough], host);
	if (code !== 0) process.exit(code);

	code = runNode(['e2e/generate-docs-html.mjs', '--module', module]);
	if (code !== 0) process.exit(code);

	const outFile = join(root, 'docs', slugify(registry[module].title) + '.html');
	console.log(`\nDoc generado: ${outFile}`);
	process.exit(0);
}

if (cmd === 'docs')
{
	const host = rest[0] === 'all' ? rest[1] : rest[0];

	for (const [, m] of Object.entries(registry))
	{
		const code = runPlaywright([m.walkthrough], host);
		if (code !== 0) process.exit(code);
	}

	const code = runNode(['e2e/generate-docs-html.mjs']);
	if (code !== 0) process.exit(code);

	console.log('\nDocs generados:');
	printDocs();
	process.exit(0);
}

console.error(`Comando desconocido: "${cmd}".`);
usage();
process.exit(1);
