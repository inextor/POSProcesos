#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shotsRoot = join(root, 'e2e', 'screenshots');
const outDir = join(root, 'docs');
const onlyModule = process.argv.findIndex(a => a === '--module') !== -1
	? process.argv[process.argv.findIndex(a => a === '--module') + 1]
	: null;

const registry = JSON.parse(await readFile(join(root, 'e2e', 'doc-modules.json'), 'utf8'));

const modules = (await readdir(shotsRoot, { withFileTypes: true }))
	.filter(entry => entry.isDirectory())
	.map(entry => entry.name)
	.filter(name => !onlyModule || name === onlyModule);

const base64Cache = new Map();
async function toBase64(dir, file) {
	const key = dir + '/' + file;
	if (base64Cache.has(key)) return base64Cache.get(key);
	const buf = await readFile(join(dir, file));
	base64Cache.set(key, buf);
	return buf;
}

function slugify(text) {
	return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

let total = 0;

for (const moduleKey of modules)
{
	const dir = join(shotsRoot, moduleKey);
	let manifest;

	try
	{
		manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
	}
	catch
	{
		console.log(`Sin manifest para '${moduleKey}' (${dir}/manifest.json). Omitido.`);
		continue;
	}

	const meta = registry[moduleKey] || {
		title: moduleKey,
		description: 'Walkthrough paso a paso del módulo ' + moduleKey + ' basado en capturas tomadas por pruebas E2E.'
	};

	const steps = (await Promise.all(
		manifest.map(async (entry) => ({
			...entry,
			data: await toBase64(dir, entry.file)
		}))
	)).map((entry) => `
	<section class="step">
		<h2><span class="step-num">${entry.order}</span> ${entry.step}</h2>
		<p class="caption">${entry.caption}</p>
		<figure>
			<img src="data:image/png;base64,${entry.data.toString('base64')}" alt="${entry.step}" loading="lazy" />
			<figcaption>${entry.test}</figcaption>
		</figure>
	</section>`)
	.join('\n');

	const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title} — Guía Visual</title>
<style>
	:root { --accent: #0d6efd; --bg: #f5f7fa; --card: #ffffff; --text: #1f2937; --muted: #6b7280; }
	* { box-sizing: border-box; }
	body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
	header { background: linear-gradient(135deg, #0d6efd, #0b5ed7); color: #fff; padding: 40px 24px; }
	header .wrap { max-width: 1100px; margin: 0 auto; }
	header h1 { margin: 0 0 8px; font-size: 28px; }
	header p { margin: 0; opacity: .9; }
	main { max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; }
	.step { background: var(--card); border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 28px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
	.step h2 { margin: 0 0 8px; font-size: 20px; display: flex; align-items: center; gap: 12px; }
	.step-num { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 15px; flex-shrink: 0; }
	.caption { color: var(--muted); margin: 0 0 16px; }
	figure { margin: 0; }
	figure img { width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 8px; display: block; }
	figcaption { font-size: 12px; color: var(--muted); margin-top: 8px; }
	footer { max-width: 1100px; margin: 0 auto; padding: 0 24px 40px; color: var(--muted); font-size: 13px; }
</style>
</head>
<body>
<header>
	<div class="wrap">
		<h1>${meta.title} — Guía Visual</h1>
		<p>${meta.description}</p>
	</div>
</header>
<main>
${steps}
</main>
<footer>Generado automáticamente por e2e/generate-docs-html.mjs a partir de e2e/screenshots/${moduleKey}/manifest.json · ${new Date().toISOString()}</footer>
</body>
</html>`;

	const outFile = join(outDir, slugify(meta.title) + '.html');
	mkdirSync(dirname(outFile), { recursive: true });
	writeFileSync(outFile, html, 'utf8');
	const count = steps.split('\n').filter(l => l.includes('data:image')).length;
	total += count;
	console.log(`Generado: ${outFile} (${count} capturas)`);
}

console.log(`\nTotal: ${modules.length} módulos, ${total} capturas.`);
