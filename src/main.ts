import {
	App,
	debounce,
	getIcon,
	getLanguage,
	KeymapEventHandler,
	MarkdownView,
	Menu,
	MenuItem,
	Notice, Platform,
	Plugin,
	PluginSettingTab,
	sanitizeHTMLToDom,
	Setting,
} from 'obsidian';

//----------------------------------
// Interfaces
//----------------------------------
interface SimpleTableMathSettings {
	fractions: number;
	locale: string | null;
	styleLastRow: boolean;
}

const DEFAULT_SETTINGS: SimpleTableMathSettings = {
	fractions: 2,
	locale: null,
	styleLastRow: true,
}

/**
 * A plugin that performs mathematical operations on Markdown tables in Obsidian.
 * The plugin actively listens to user interactions and processes table data accordingly.
 */
export default class SimpleTableMath extends Plugin {
	//---------------------------------------------------
	//
	//  Variables
	//
	//---------------------------------------------------
	settings: SimpleTableMathSettings;

	keymapHandlers: KeymapEventHandler[] = [];
	debouncedProcessing: () => void;
	preventProcessing: boolean = false;
	forceProcessing: boolean = false;

	//---------------------------------------------------
	//
	//  Plugin Lifecycle
	//
	//---------------------------------------------------
	async onload() {
		const app: App = this.app;
		const workspace = app.workspace;

		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		this.debouncedProcessing = debounce(this.process.bind(this), 250);

		workspace.onLayoutReady(() => {
			this.registerEvent(workspace.on('layout-change', this.debouncedProcessing));
			this.registerEvent(workspace.on('editor-change', this.debouncedProcessing));
			this.registerEvent(workspace.on('editor-menu', this.handleEditorMenuEvent.bind(this)));

			this.keymapHandlers = [
				app.scope.register(null, 'Tab', this.debouncedProcessing),
				app.scope.register(null, 'ArrowLeft', this.debouncedProcessing),
				app.scope.register(null, 'ArrowUp', this.debouncedProcessing),
				app.scope.register(null, 'ArrowRight', this.debouncedProcessing),
				app.scope.register(null, 'ArrowDown', this.debouncedProcessing),
			]

			this.registerDomEvent(document, 'click', this.debouncedProcessing);
			this.registerDomEvent(document, 'keydown', this.handleKeyDownEvent.bind(this));
		});

		this.registerEvent(workspace.on('file-open', () => {
			this.forceProcessing = true;
			this.debouncedProcessing();
		}));
	}

	onunload() {
		this.keymapHandlers.forEach((handler) => {
			this.app.scope.unregister(handler);
		});
	}

	//---------------------------------------------------
	//
	//  Methods
	//
	//---------------------------------------------------

	//----------------------------------
	// Table Processing
	//----------------------------------
	process() {
		if (!this.preventProcessing) {
			this.preventProcessing = true;

			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			const viewMode = activeView?.getMode() || null;
			const isReadingMode = viewMode === 'preview';

			let tables: HTMLTableElement[] = [];
			const tableSelector = isReadingMode ? 'div.el-table > table' : 'div.markdown-rendered table.table-editor';
			if (isReadingMode || this.forceProcessing) {
				tables = Array.from(document.querySelectorAll(tableSelector)) || [];
				this.forceProcessing = false;
			}
			const table = document.activeElement?.closest(tableSelector);
			if (table) {
				this.forceProcessing = true;
				tables = [table] as HTMLTableElement[];
			}

			const rowClasses = [
				'stm-row',
				...(this.settings.styleLastRow ? [] :  ['off']),
			];

			tables.forEach((table) => {
				const rows = Array.from(table.querySelectorAll('tr'));
				rows.forEach((row, rowIndex) => {
					const cells = Array.from(row.children) as HTMLTableCellElement[];
					cells.forEach((cell, colIndex) => {
						const rawText = this.extractCellContent(cell).trim().toLowerCase() || '';
						const match = rawText.match(/^([a-z]{3})([<^])(?:(\d+)(?::(\d+))?)?([a-z]{2,4})?$/i);
						const isActiveElement = this.isDocumentActiveElementChildOf(cell)
						if (match && !isActiveElement) {
							const operation = match[1].toLowerCase();
							const direction = match[2];
							const startStr = match[3];
							const endStr = match[4];
							const currency = match[5]?.toUpperCase() || null;
							const values: number[] = [];

							let startIndex = startStr ? parseInt(startStr, 10) - 1 : 0;
							if (isNaN(startIndex)) {
								startIndex = 0;
							}

							let endIndex = endStr ? parseInt(endStr, 10) - 1 : -1;
							if (isNaN(endIndex)) {
								endIndex = -1;
							}

							if (direction === '^') {
								const actualStartRow = Math.max(0, startIndex);
								const actualEndRow = endIndex !== -1 ? endIndex : rowIndex - 1;
								const finalEndRow = Math.min(actualEndRow, rowIndex - 1);
								if (actualStartRow <= finalEndRow) {
									for (let r = actualStartRow; r <= finalEndRow; r++) {
										const aboveCell = rows[r]?.children?.[colIndex] as HTMLTableCellElement | undefined | null;
										const textContent = this.extractCellContent(aboveCell, true);
										const value = this.extractNumber(textContent);
										if (value !== null) {
											values.push(value);
										}
									}
								}
							} else if (direction === '<') {
								const actualStartCol = Math.max(0, startIndex);
								const actualEndCol = endIndex !== -1 ? endIndex : colIndex - 1;
								const finalEndCol = Math.min(actualEndCol, colIndex - 1);
								if (actualStartCol <= finalEndCol) {
									for (let c = actualStartCol; c <= finalEndCol; c++) {
										const leftCell = cells[c] as HTMLTableCellElement | undefined | null;
										const textContent = this.extractCellContent(leftCell, true);
										const value = this.extractNumber(textContent);
										if (value !== null) {
											values.push(value);
										}
									}
								}
							}

							let result: number | null = null;
							if (operation === 'sum') {
								result = values.reduce((a, b) => a + b, 0);
							} else if (operation === 'avg' && values.length > 0) {
								result = values.reduce((a, b) => a + b, 0) / values.length;
							} else if (operation === 'min') {
								result = values.length > 0 ? Math.min(...values) : 0;
							} else if (operation === 'max') {
								result = values.length > 0 ? Math.max(...values) : 0;
							} else if (operation === 'sub') {
								result = values.length > 0 ? values.reduce((a, b) => a - b) : 0;
							} else if (operation === 'mul') {
								result = values.length > 1 ? values.reduce((a, b) => a * b, 1) : 0;
							} else if (operation === 'div' && values.length > 0) {
								result = values[0];
								if (values.length > 1) {
									for (let i = 1; i < values.length; i++) {
										result = result / values[i];
									}
								}
							}

							if (result !== null) {
								let vElement = cell.querySelector('div.stm-value') as HTMLElement | null;
								if (isReadingMode) {
									vElement = cell;
									cell.classList.add('stm-value');
								}
								if (!vElement) {
									vElement = document.createElement('div');
									vElement.classList.add('stm-value');
									cell.prepend(vElement);
								}

								if (vElement) {
									cell.classList.add('stm-cell');
									cell.tabIndex = -1;
									cell.closest('tr')?.classList.add(...rowClasses);
									const defaultLocale = getLanguage();
									vElement.textContent = result.toLocaleString(this.settings.locale || defaultLocale, {
										style: currency ? 'currency' : 'decimal',
										currency: currency || undefined,
										minimumFractionDigits: this.settings.fractions,
										maximumFractionDigits: this.settings.fractions,
									});
								}
							}
						} else if (!isActiveElement && cell.classList.contains('stm-cell')) {
							let vElement = cell.querySelector('div.stm-value') as HTMLElement | null;
							if (vElement) {
								cell.removeChild(vElement);
								const row = cell.closest('tr');
								if (row) {
									const values = row.querySelectorAll('.stm-value');
									if (values.length === 0) {
										row.classList.remove(...rowClasses);
									}
								}
							}
						}
					});
				});
			});
		}
		this.preventProcessing = false;
	}

	//----------------------------------
	// Settings Methods
	//----------------------------------
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		const trs = document.querySelectorAll('tr.stm-row');
		trs.forEach((tr) => {
			if (this.settings.styleLastRow) {
				tr.classList.remove('off');
			} else {
				tr.classList.add('off');
			}
		})
	}

	//----------------------------------
	// UI Methods
	//----------------------------------
	showNotice(message: string, icon: string | null = null, duration: number = 1000) {
		const fragment = sanitizeHTMLToDom(`<span class="stm-notice">${message}</span>`);
		if (icon) {
			const svg = getIcon(icon);
			if (svg) {
				fragment.prepend(svg);
			}
		}
		new Notice(fragment, duration);
	}

	//----------------------------------
	// Event Handlers
	//----------------------------------
	handleEditorMenuEvent(menu: Menu) {
		const cell = document.activeElement?.closest('td.stm-cell');
		const value = cell?.querySelector('.stm-value') as HTMLElement | null;
		if (value) {
			menu.addItem((item: MenuItem) => {
				item
					.setTitle('Copy calculated value')
					.setIcon('square-equal')
					.onClick(async () => {
						navigator.clipboard.writeText(value.textContent || '');
						this.showNotice('Copied!', 'copy-check');
					});
			});
		}
	}

	handleKeyDownEvent(evt: KeyboardEvent) {
		if (this.isCopyShortcut(evt)) {
			this.process();
			const cell = document.activeElement?.closest('td.stm-cell, th.stm-cell');
			if (cell) {
				const value = cell.querySelector('.stm-value') as HTMLElement | null;
				if (value) {
					setTimeout(() => {
						navigator.clipboard.writeText(value.textContent || '');
						this.showNotice('Copied!', 'copy-check');
					}, 25);
				}
			}
		}
	}

	//----------------------------------
	// Helper Methods
	//----------------------------------
	extractCellContent(cell: HTMLTableCellElement | null | undefined, treatAsValue: boolean = false): string {
		if (!cell) {
			return '';
		}
		let element = cell.querySelector('.table-cell-wrapper') as HTMLElement | null;
		if (treatAsValue) {
			let valueElement = cell.querySelector('.stm-value') as HTMLElement | null;
			if (valueElement) {
				element = valueElement;
			}
		}
		const wrapper = element || cell;
		return wrapper?.textContent || '';
	}

	extractNumber(str: string | null): number | null{
		if (!str) {
			return null;
		}

		const match = str.match(/-?\d+(?:[.,'’`\u202f]\d{3})*(?:[.,]\d+)?/);
		if (!match) {
			return null;
		}

		let numStr = match[0].replace(/['’`\u202f]/g, '');
		const commaIndex = numStr.lastIndexOf(',');
		const dotIndex = numStr.lastIndexOf('.');
		if (commaIndex > dotIndex) {
			numStr = numStr.replace(/\./g, '').replace(',', '.');
		} else {
			numStr = numStr.replace(/,/g, '');
		}
		const result = parseFloat(numStr);
		return !isNaN(result) ? result : null;
	}

	isDocumentActiveElementChildOf(parentNode: HTMLElement): boolean {
		if (!document.activeElement || !parentNode) {
			return false;
		}
		return parentNode.contains(document.activeElement);
	}

	isCopyShortcut(evt: KeyboardEvent) {
		if (Platform.isMacOS) {
			return evt.metaKey && evt.key === 'c' && !evt.altKey && !evt.shiftKey;
		}
		return evt.ctrlKey && evt.key === 'c' && !evt.altKey && !evt.shiftKey;
	}
}

/**
 * Represents the settings tab for configuring the SimpleTableMath plugin.
 *
 * This class provides a user interface within the plugin settings to allow
 * users to customize specific plugin options such as the number of decimal places
 * displayed and locale-based number formatting.
 */
class SettingTab extends PluginSettingTab {
	plugin: SimpleTableMath;

	constructor(app: App, plugin: SimpleTableMath) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Fractions')
			.setDesc('Maximum number of decimal places to display.')
			.addText(text => text
				.setPlaceholder('Enter a number')
				.setValue(this.plugin.settings.fractions.toString())
				.onChange(async (value) => {
					this.plugin.settings.fractions = parseInt(value, 10) || 0;
					await this.plugin.saveSettings();
				}));

		const language = getLanguage();
		new Setting(containerEl)
			.setName('Number formatting')
			.setDesc(sanitizeHTMLToDom(`Enter a locale code (language tag like en, en-US, or de-CH) to customize how numbers are formatted, (e.g., decimal separators, thousands separators).<br/><br/>If left empty, the current Obsidian app language ("${language}") will be used for number formatting.<br/><a href="https://en.wikipedia.org/wiki/Language_code" target="_blank">Learn more about language codes</a>`))
			.addText(text => text
				.setPlaceholder(`e.g.: en, en-US, de-CH`) // Using the clearer example format
				.setValue(this.plugin.settings.locale || '')
				.onChange(async (value) => {
					this.plugin.settings.locale = (value === '') ? null : value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Highlight last row calculations')
			.setDesc(sanitizeHTMLToDom(`Enable styling for the last row in tables that contain calculations.<br/><a href="https://github.com/eatcodeplay/obsidian-simple-table-math#css-look--feel" target="_blank">Learn more about styling the results</a>`))
			.addToggle(component => component
				.setValue(this.plugin.settings.styleLastRow)
				.onChange(async (value) => {
					this.plugin.settings.styleLastRow = value;
					await this.plugin.saveSettings();
				}));
	}
}
