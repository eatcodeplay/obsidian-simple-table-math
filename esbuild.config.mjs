import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';
import { sassPlugin } from 'esbuild-sass-plugin';
import { cp, readFile } from 'node:fs/promises';
import 'dotenv/config';

const getBanner = async () => {
	const manifest = JSON.parse(await readFile('./manifest.json', 'utf-8'));
	return `/** 
 * Simple Table Math v${manifest.version}
 * @author ${manifest.author}
 * @url ${manifest.authorUrl}
 */`;
};
const prod = (process.argv[2] === 'production');
const vaultCopy = {
	name: 'vault-copy',
	setup(build) {
		build.onEnd(async () => {
			const vaultPluginPath = process.env.VAULT_PLUGIN_PATH;
			if (vaultPluginPath) {
				try {
					await Promise.all([
						cp('dist/main.js', `${vaultPluginPath}/main.js`, { overwrite: true }),
						cp('manifest.json', `${vaultPluginPath}/manifest.json`, { overwrite: true }),
						cp('dist/styles.css', `${vaultPluginPath}/styles.css`, { overwrite: true }),
					]);
				} catch (copyError) {
					console.error('Error copying files:', copyError);
				}
			}
		});
	},
};

const context = await esbuild.context({
	banner: {
		js: await getBanner(),
	},
	entryPoints: [
		'src/main.ts',
		'src/styles.scss',
	],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/view',
		'@lezer/common',
		'@lezer/highlight',
		'@lezer/lr',
		...builtins],
	format: 'cjs',
	target: 'es2018',
	logLevel: 'info',
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outdir: 'dist',
	plugins: [sassPlugin(), vaultCopy],
	minify: prod,
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
