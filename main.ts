import { Plugin, MarkdownView, Notice, Editor, PluginSettingTab, Setting } from 'obsidian';

// Settings Interface
interface SlashMenuSettings {
	maxMenuItems: number;
	enableMouse: boolean;
	debugMode: boolean;
}

const DEFAULT_SETTINGS: SlashMenuSettings = {
	maxMenuItems: 5,
	enableMouse: true,
	debugMode: true
};

export default class SlashPlugin extends Plugin {
	settings: SlashMenuSettings;
	currentMenu: HTMLElement | null = null;
	currentMenuItems: HTMLElement[] = [];
	currentFilteredOptions: any[] = [];
	currentSelectedIndex: number = 0;
	isMenuOpen: boolean = false;
	recentCommands: string[] = [];

	async onload() {
		console.log("✅ Advanced Slash Menu Plugin geladen");
		await this.loadSettings();
		
		new Notice("🎉 Advanced Slash Menu aktiviert!");

		// Register unified keyboard handler
		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			this.handleKeydown(evt);
		});

		// Register input handler for live filtering - multiple events to catch all typing
		this.registerDomEvent(document, 'input', (evt: Event) => {
			this.handleInput(evt);
		});
		
		this.registerDomEvent(document, 'keyup', (evt: KeyboardEvent) => {
			this.handleKeyup(evt);
		});

		// Add settings tab
		this.addSettingTab(new SlashMenuSettingTab(this.app, this));

		console.log("🔧 Plugin Setup abgeschlossen");
	}

	handleKeydown(evt: KeyboardEvent) {
		console.log("🎹 KEY EVENT:", evt.key, "Menu open:", this.isMenuOpen);
		
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView || activeView.getMode() !== 'source') return;

		// If menu is open, only block specific keys that conflict with menu navigation
		if (this.isMenuOpen) {
			// Only block arrow keys and enter when menu is open - let typing through
			if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(evt.key)) {
				evt.preventDefault();
				evt.stopPropagation();
				console.log("🚫 Blocked navigation key for menu:", evt.key);
			}
			// Let all other keys (typing) pass through normally
			return;
		}

		// Check for slash to open menu
		if (evt.key === '/' && !this.isMenuOpen) {
			console.log("⤵ Slash erkannt!");
			const editor = activeView.editor;
			setTimeout(() => {
				this.openSlashMenu(editor);
			}, 10);
		}
	}

	handleInput(evt: Event) {
		// Not needed anymore - input field handles its own events
		return;
	}

	handleKeyup(evt: KeyboardEvent) {
		// Not needed anymore - input field handles its own events
		return;
	}

	openSlashMenu(editor: Editor) {
		const coords = this.getCursorCoords(editor);
		this.showSlashMenu(coords);
	}

	getCursorCoords(editor: Editor) {
		const cursor = editor.getCursor();
		
		// Get the CodeMirror 6 editor element
		const editorEl = (editor as any).cm?.dom;
		if (!editorEl) {
			return { top: 200, left: 300 };
		}

		// Get the bounding rect of the editor
		const editorRect = editorEl.getBoundingClientRect();
		
		// Try to get the actual cursor position from CodeMirror
		const cm = (editor as any).cm;
		if (cm && cm.coordsAtPos) {
			try {
				const pos = editor.posToOffset(cursor);
				const coords = cm.coordsAtPos(pos);
				if (coords) {
					return {
						top: coords.bottom + 5, // Position below the cursor
						left: coords.left
					};
				}
			} catch (e) {
				console.log("Fallback to estimated position");
			}
		}

		// Fallback: estimate position
		const lineHeight = 24;
		const charWidth = 8;
		return {
			top: editorRect.top + cursor.line * lineHeight + lineHeight + 5,
			left: editorRect.left + cursor.ch * charWidth + 10
		};
	}

	showSlashMenu(coords: any) {
		this.closeMenu();
		
		const menu = document.createElement('div');
		menu.className = 'slash-menu';
		this.currentMenu = menu;
		this.isMenuOpen = true;
		this.currentSelectedIndex = 0; // Start with first item selected

		// Style the menu
		menu.style.cssText = `
			position: fixed;
			top: ${coords.top}px;
			left: ${coords.left}px;
			background: var(--background-primary);
			border: 1px solid var(--divider-color);
			border-radius: 8px;
			padding: 0;
			box-shadow: 0 4px 16px rgba(0,0,0,0.15);
			z-index: 9999;
			min-width: 280px;
			max-width: 400px;
			max-height: 300px;
			overflow: hidden;
		`;

		// Create input field for live typing
		const inputField = document.createElement('input');
		inputField.type = 'text';
		inputField.className = 'slash-input';
		inputField.placeholder = 'Type a command...';
		inputField.style.cssText = `
			width: 100%;
			padding: 8px 12px;
			border: none;
			border-bottom: 1px solid var(--divider-color);
			background: var(--background-secondary);
			color: var(--text-normal);
			font-size: 14px;
			outline: none;
			box-sizing: border-box;
		`;
		
		// Make input field focusable and ensure it captures keyboard events
		inputField.tabIndex = 0;
		inputField.setAttribute('autocomplete', 'off');
		inputField.setAttribute('autocorrect', 'off');
		inputField.setAttribute('spellcheck', 'false');

		// Create results container
		const resultsContainer = document.createElement('div');
		resultsContainer.className = 'slash-results';
		resultsContainer.style.cssText = `
			max-height: 250px;
			overflow-y: auto;
			padding: 4px 0;
		`;

		menu.appendChild(inputField);
		menu.appendChild(resultsContainer);

		// Store references
		(menu as any).inputField = inputField;
		(menu as any).resultsContainer = resultsContainer;

		// Initial render with top commands
		const allOptions = this.getAllCommands();
		const defaultOptions = this.smartFilter(allOptions, '');
		this.renderMenuResults(resultsContainer, defaultOptions);

		// Input event listener for live filtering
		const inputHandler = (evt: Event) => {
			const query = (evt.target as HTMLInputElement).value;
			console.log("🔍 INPUT CHANGE:", `"${query}"`);
			
			const filteredOptions = this.smartFilter(allOptions, query);
			this.renderMenuResults(resultsContainer, filteredOptions);
			
			// Keep focus on input field after filtering
			setTimeout(() => {
				if (this.isMenuOpen && inputField) {
					inputField.focus();
				}
			}, 10);
		};

		inputField.addEventListener('input', inputHandler);
		(menu as any).inputHandler = inputHandler;

		// Keyboard event listener for navigation
		const keyHandler = (evt: KeyboardEvent) => {
			console.log("🎛️ MENU INPUT KEY EVENT:", evt.key, "Current focus:", document.activeElement);
			
			// Always prevent default for navigation keys to stop them reaching the editor
			switch (evt.key) {
				case 'ArrowDown':
					evt.preventDefault();
					evt.stopPropagation();
					console.log("⬇️ Arrow DOWN detected in input");
					this.navigateDown();
					break;
				case 'ArrowUp':
					evt.preventDefault();
					evt.stopPropagation();
					console.log("⬆️ Arrow UP detected in input");
					this.navigateUp();
					break;
				case 'Enter':
					evt.preventDefault();
					evt.stopPropagation();
					console.log("⏎ ENTER detected in input");
					this.executeSelected();
					break;
				case 'Escape':
					evt.preventDefault();
					evt.stopPropagation();
					console.log("🔚 ESCAPE detected in input");
					this.closeMenu();
					break;
				// Let other keys through for typing, but keep focus on input
				default:
					// For typing keys, make sure focus stays on input
					if (evt.key.length === 1) {
						console.log("📝 Typing key:", evt.key);
						// Don't prevent default for typing keys
					}
					break;
			}
		};

		inputField.addEventListener('keydown', keyHandler);
		(menu as any).keyHandler = keyHandler;

		// Handle clicking outside
		const closeMenu = (evt: MouseEvent) => {
			if (!menu.contains(evt.target as Node)) {
				this.closeMenu();
			}
		};

		setTimeout(() => {
			document.addEventListener('click', closeMenu);
			(menu as any).closeMenuHandler = closeMenu;
			
			// Focus the input field for immediate typing
			inputField.focus();
			console.log("🎯 Input field focused for typing and keyboard navigation");
		}, 100);

		document.body.appendChild(menu);
		
		if (this.settings.debugMode) {
			console.log("🎯 Interactive slash menu opened");
		}
	}

	renderMenuResults(container: HTMLElement, options: any[]) {
		container.innerHTML = '';
		this.currentMenuItems = [];
		this.currentFilteredOptions = options;
		
		// Only reset selection if we have fewer items than current selection
		const maxItems = Math.min(options.length, this.settings.maxMenuItems);
		if (this.currentSelectedIndex >= maxItems) {
			this.currentSelectedIndex = Math.max(0, maxItems - 1);
		}

		console.log("🎨 Rendering", options.length, "menu results, selection index:", this.currentSelectedIndex);

		// If no options, show "no results" message
		if (options.length === 0) {
			const noResults = document.createElement('div');
			noResults.className = 'slash-no-results';
			noResults.style.cssText = `
				padding: 16px 12px;
				text-align: center;
				color: var(--text-muted);
				font-style: italic;
			`;
			noResults.textContent = 'Keine passenden Befehle gefunden';
			container.appendChild(noResults);
			this.currentSelectedIndex = -1; // No valid selection
			return;
		}

		// Limit to max items
		const limitedOptions = options.slice(0, this.settings.maxMenuItems);
		const hasMore = options.length > this.settings.maxMenuItems;

		limitedOptions.forEach((option, index) => {
			const item = this.createMenuItem(option, index);
			container.appendChild(item);
			this.currentMenuItems.push(item);
		});

		// Show "+X more" if needed
		if (hasMore) {
			const moreItem = document.createElement('div');
			moreItem.className = 'slash-menu-more';
			moreItem.style.cssText = `
				padding: 8px 12px;
				font-size: 12px;
				opacity: 0.7;
				text-align: center;
				border-top: 1px solid var(--divider-color);
			`;
			moreItem.textContent = `+${options.length - this.settings.maxMenuItems} weitere Ergebnisse...`;
			container.appendChild(moreItem);
		}

		// Highlight selected item (not always first!)
		this.updateSelection();
	}

	// Keep the old renderMenu for compatibility
	renderMenu(menu: HTMLElement, options: any[]) {
		this.renderMenuResults(menu, options);
	}

	createMenuItem(option: any, index: number) {
		const item = document.createElement('div');
		item.className = 'slash-menu-item';
		item.style.cssText = `
			padding: 8px 12px;
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 10px;
			border-radius: 4px;
			margin: 0 4px;
		`;

		// Icon (User Story 5)
		const iconEl = document.createElement('div');
		iconEl.innerHTML = option.icon || '•';
		iconEl.style.cssText = 'font-size: 16px; width: 20px; text-align: center;';

		// Content
		const contentEl = document.createElement('div');
		contentEl.style.cssText = 'flex: 1;';
		
		const titleEl = document.createElement('div');
		titleEl.innerHTML = option.label;
		titleEl.style.cssText = 'font-weight: 500;';
		
		const descEl = document.createElement('div');
		descEl.innerHTML = option.description || '';
		descEl.style.cssText = 'font-size: 11px; opacity: 0.7; margin-top: 2px;';

		contentEl.appendChild(titleEl);
		if (option.description) {
			contentEl.appendChild(descEl);
		}

		item.appendChild(iconEl);
		item.appendChild(contentEl);

		// Mouse events (User Story 7)
		if (this.settings.enableMouse) {
			item.addEventListener('mouseenter', () => {
				this.currentSelectedIndex = index;
				this.updateSelection();
			});

			item.addEventListener('click', () => {
				this.executeOption(option);
			});
		}

		return item;
	}

	updateSelection() {
		console.log("✨ Update selection for index:", this.currentSelectedIndex, "of", this.currentMenuItems.length, "items");
		
		// If no valid selection, don't highlight anything
		if (this.currentSelectedIndex < 0 || this.currentSelectedIndex >= this.currentMenuItems.length) {
			console.log("❌ Invalid selection index, clearing highlights");
			this.currentMenuItems.forEach(item => {
				item.style.background = 'transparent';
				item.style.color = 'var(--text-normal)';
				item.style.fontWeight = '500';
				item.classList.remove('active');
			});
			return;
		}
		
		this.currentMenuItems.forEach((item, index) => {
			if (index === this.currentSelectedIndex) {
				item.style.background = 'var(--interactive-accent)';
				item.style.color = 'var(--text-on-accent)';
				item.style.fontWeight = '600';
				item.classList.add('active');
				
				// Scroll into view
				item.scrollIntoView({ 
					behavior: 'smooth', 
					block: 'nearest' 
				});
				
				console.log("✅ Selected item:", index, item.textContent?.trim());
			} else {
				item.style.background = 'transparent';
				item.style.color = 'var(--text-normal)';
				item.style.fontWeight = '500';
				item.classList.remove('active');
			}
		});
	}

	navigateDown() {
		const maxItems = Math.min(this.currentFilteredOptions.length, this.settings.maxMenuItems);
		
		if (maxItems > 0) {
			// If no valid selection, start at 0
			if (this.currentSelectedIndex < 0) {
				this.currentSelectedIndex = 0;
			} else {
				// Move down, wrap around at end
				this.currentSelectedIndex = (this.currentSelectedIndex + 1) % maxItems;
			}
			
			console.log("🔽 Navigate DOWN to index:", this.currentSelectedIndex, "of", maxItems, "items");
			this.updateSelection();
		} else {
			console.log("🔽 Navigate DOWN: No items to navigate");
		}
	}

	navigateUp() {
		const maxItems = Math.min(this.currentFilteredOptions.length, this.settings.maxMenuItems);
		
		if (maxItems > 0) {
			// If no valid selection, start at last item
			if (this.currentSelectedIndex < 0) {
				this.currentSelectedIndex = maxItems - 1;
			} else {
				// Move up, wrap around at beginning
				this.currentSelectedIndex = this.currentSelectedIndex > 0 ? 
					this.currentSelectedIndex - 1 : 
					maxItems - 1;
			}
			
			console.log("🔼 Navigate UP to index:", this.currentSelectedIndex, "of", maxItems, "items");
			this.updateSelection();
		} else {
			console.log("🔼 Navigate UP: No items to navigate");
		}
	}

	executeSelected() {
		console.log("🔥 EXECUTE SELECTED DEBUG:");
		console.log("- Current selected index:", this.currentSelectedIndex);
		console.log("- Current filtered options length:", this.currentFilteredOptions.length);
		console.log("- Current menu items length:", this.currentMenuItems.length);
		
		// Check if we have valid selection
		if (this.currentSelectedIndex < 0) {
			console.log("❌ No valid selection (index < 0)");
			return;
		}
		
		const limitedOptions = this.currentFilteredOptions.slice(0, this.settings.maxMenuItems);
		console.log("- Limited options length:", limitedOptions.length);
		
		if (limitedOptions.length > 0 && 
			this.currentSelectedIndex >= 0 && 
			this.currentSelectedIndex < limitedOptions.length) {
			
			const selectedOption = limitedOptions[this.currentSelectedIndex];
			console.log("- Selected option:", selectedOption);
			
			this.executeOption(selectedOption);
		} else {
			console.error("❌ KEYBOARD SELECTION FAILED - Invalid index or no options");
			console.log("- Index valid:", this.currentSelectedIndex >= 0 && this.currentSelectedIndex < limitedOptions.length);
			console.log("- Options exist:", limitedOptions.length > 0);
			
			// Show user feedback
			new Notice("❌ Keine gültige Auswahl");
		}
	}

	executeOption(option: any) {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView || activeView.getMode() !== 'source') {
			this.closeMenu();
			return;
		}

		const editor = activeView.editor;
		
		console.log("🎯 Executing option:", option.label, "with insert:", option.insert);
		
		// Get current state BEFORE closing menu
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		
		// Get the input field value to see what the user typed
		const inputValue = this.currentMenu && (this.currentMenu as any).inputField 
			? (this.currentMenu as any).inputField.value 
			: '';
		
		console.log("📍 Current cursor:", cursor);
		console.log("📄 Current line:", line);
		console.log("⌨️ Input field value:", `"${inputValue}"`);
		
		// Close menu
		this.closeMenu();
		
		// Add to recent commands
		this.addToRecent(option.label);
		
		// Execute the option
		if (option.handler) {
			console.log("🔧 Using custom handler");
			option.handler(editor);
		} else if (option.insert) {
			console.log("🔧 Using simple insert method");
			this.smartInsert(editor, option.insert, cursor, line, inputValue);
		}
		
		new Notice(`✅ ${option.label} eingefügt!`);
	}

	smartInsert(editor: Editor, textToInsert: string, originalCursor: any, originalLine: string, inputValue: string) {
		// This is the improved version that handles the input field
		const beforeCursor = originalLine.substring(0, originalCursor.ch);
		const afterCursor = originalLine.substring(originalCursor.ch);
		const slashIndex = beforeCursor.lastIndexOf('/');
		
		console.log("🧠 SmartInsert Debug:");
		console.log("- Text to insert:", textToInsert);
		console.log("- Before cursor:", beforeCursor);
		console.log("- After cursor:", afterCursor);
		console.log("- Slash index:", slashIndex);
		console.log("- Input value:", `"${inputValue}"`);
		
		if (slashIndex !== -1) {
			// Replace everything from the slash onwards with our text
			const beforeSlash = beforeCursor.substring(0, slashIndex);
			const newLine = beforeSlash + textToInsert + afterCursor;
			
			console.log("- Before slash:", beforeSlash);
			console.log("- New line:", newLine);
			
			// Set the new line
			editor.setLine(originalCursor.line, newLine);
			
			// Position cursor after the inserted text
			const newCursorPos = slashIndex + textToInsert.length;
			
			setTimeout(() => {
				editor.setCursor(originalCursor.line, newCursorPos);
				editor.focus();
				console.log("- Cursor positioned at:", newCursorPos);
			}, 10);
		} else {
			console.log("❌ No slash found!");
		}
	}

	// Legacy method for compatibility
	simpleInsert(editor: Editor, textToInsert: string, originalCursor: any, originalLine: string) {
		this.smartInsert(editor, textToInsert, originalCursor, originalLine, '');
	}

	updateMenuFromCurrentText() {
		if (!this.isMenuOpen || !this.currentMenu) {
			console.log("🔍 UPDATE MENU: Not open or no menu element");
			return;
		}

		// Get query from input field instead of editor
		const inputField = (this.currentMenu as any).inputField;
		if (!inputField) {
			console.log("🔍 UPDATE MENU: No input field found");
			return;
		}
		
		const query = inputField.value.toLowerCase().trim();
		console.log("🔍 UPDATE MENU from input field:", `"${query}"`);
		
		const allOptions = this.getAllCommands();
		console.log("- Total commands available:", allOptions.length);
		
		// Filter options based on query from input field
		const filteredOptions = this.smartFilter(allOptions, query);
		console.log("- Filtered to:", filteredOptions.length, "commands");
		
		// Show which commands matched
		filteredOptions.forEach(cmd => {
			console.log(`  ✅ "${cmd.label}" matched`);
		});
		
		// Update menu with filtered results
		const resultsContainer = (this.currentMenu as any).resultsContainer;
		if (resultsContainer) {
			this.renderMenuResults(resultsContainer, filteredOptions);
		}
		
		console.log(`🔍 Live-Filter: "${query}" → ${filteredOptions.length} Ergebnisse`);
	}

	smartFilter(commands: any[], query: string) {
		console.log("🧠 SMART FILTER - Query:", `"${query}"`);
		
		// If no query, show top commands (not all!)
		if (!query) {
			console.log("- No query, showing top 5 default commands");
			const topCommands = [
				...commands.filter(cmd => ['Heading 1', 'Heading 2', 'To-Do', 'Bullet List', 'Code Block'].includes(cmd.label))
			];
			return topCommands.slice(0, 5);
		}

		// Filter commands that match the query
		const matches = commands.filter(cmd => {
			const labelMatch = cmd.label.toLowerCase().includes(query);
			const descMatch = cmd.description?.toLowerCase().includes(query);
			const synonymMatch = cmd.synonyms && cmd.synonyms.some((s: string) => s.toLowerCase().includes(query));
			
			const hasMatch = labelMatch || descMatch || synonymMatch;
			
			if (hasMatch) {
				console.log(`✅ "${cmd.label}" matches query "${query}"`);
				
				// Calculate match score for sorting
				cmd.matchScore = 0;
				
				// Exact label match gets highest score
				if (cmd.label.toLowerCase() === query) cmd.matchScore += 100;
				// Label starts with query gets high score  
				else if (cmd.label.toLowerCase().startsWith(query)) cmd.matchScore += 50;
				// Label contains query gets medium score
				else if (labelMatch) cmd.matchScore += 25;
				// Synonym match gets lower score
				else if (synonymMatch) cmd.matchScore += 15;
				// Description match gets lowest score
				else if (descMatch) cmd.matchScore += 5;
				
				console.log(`  → Match score: ${cmd.matchScore}`);
			}
			
			return hasMatch;
		});

		// Sort by match score (higher = better), then alphabetically
		const sorted = matches.sort((a, b) => {
			const scoreDiff = (b.matchScore || 0) - (a.matchScore || 0);
			if (scoreDiff !== 0) return scoreDiff;
			return a.label.localeCompare(b.label);
		});
		
		console.log(`🧠 Smart filtered ${commands.length} → ${sorted.length} commands`);
		
		// Return top 5 matches
		return sorted.slice(0, 5);
	}

	// Legacy method - now calls smartFilter
	filterOptions(options: any[], query: string) {
		return this.smartFilter(options, query);
	}

	addToRecent(label: string) {
		// Remove if already exists
		this.recentCommands = this.recentCommands.filter(cmd => cmd !== label);
		// Add to front
		this.recentCommands.unshift(label);
		// Keep only last 10
		this.recentCommands = this.recentCommands.slice(0, 10);
	}

	getAllCommands() {
		const commands = [
			// Text Commands
			{
				label: 'Heading 1',
				insert: '# ',
				description: 'Insert large header',
				icon: '📰',
				priority: 0,
				synonyms: ['h1', 'header', 'title', 'heading1', 'head', 'large']
			},
			{
				label: 'Heading 2',
				insert: '## ',
				description: 'Insert medium header',
				icon: '📋',
				priority: 0,
				synonyms: ['h2', 'header', 'subtitle', 'heading2', 'head', 'medium']
			},
			{
				label: 'Heading 3',
				insert: '### ',
				description: 'Insert small header',
				icon: '📄',
				priority: 0,
				synonyms: ['h3', 'header', 'heading3', 'head', 'small']
			},
			
			// List Commands
			{
				label: 'To-Do',
				insert: '- [ ] ',
				description: 'Task checkbox',
				icon: '☑️',
				priority: 0,
				synonyms: ['todo', 'task', 'checkbox', 'check', 't', 'tick']
			},
			{
				label: 'Bullet List',
				insert: '- ',
				description: 'Unordered list',
				icon: '🔹',
				priority: 0,
				synonyms: ['list', 'bullet', 'ul', 'unordered', 'dash', '-']
			},
			{
				label: 'Numbered List',
				insert: '1. ',
				description: 'Ordered list',
				icon: '🔢',
				priority: 0,
				synonyms: ['numbered', 'ordered', 'ol', 'list', 'number', '1']
			},

			// Media Commands
			{
				label: 'Code Block',
				insert: '```\n\n```',
				description: 'Code snippet',
				icon: '💻',
				priority: 0,
				synonyms: ['code', 'snippet', 'programming', 'c', 'prog', '```']
			},
			{
				label: 'Math Block',
				insert: '$$\n\n$$',
				description: 'LaTeX math formula',
				icon: '🧮',
				priority: 0,
				synonyms: ['math', 'latex', 'formula', 'equation', 'm', '$$']
			},
			{
				label: 'Highlight',
				insert: '==',
				description: 'Highlight text',
				icon: '🌟',
				priority: 0,
				synonyms: ['highlight', 'mark', 'yellow', 'hl', '==']
			},
			{
				label: 'Horizontal Line',
				insert: '\n---\n',
				description: 'Horizontal separator',
				icon: '➖',
				priority: 0,
				synonyms: ['hr', 'line', 'separator', 'divider', 'horizontal', '---']
			}
		];

		// Add recent usage bonus (small bonus, not primary sorting)
		commands.forEach(cmd => {
			cmd.priority += this.getRecentPriority(cmd.label);
		});

		// Don't sort here anymore - let smartFilter handle sorting based on query relevance
		return commands;
	}

	getRecentPriority(label: string): number {
		const index = this.recentCommands.indexOf(label);
		// Give only small bonus for recent usage (1-10 points instead of 100)
		return index === -1 ? 0 : (10 - index);
	}

	closeMenu() {
		if (this.currentMenu) {
			// Remove event listeners
			if ((this.currentMenu as any).closeMenuHandler) {
				document.removeEventListener('click', (this.currentMenu as any).closeMenuHandler);
			}
			
			if ((this.currentMenu as any).inputHandler && (this.currentMenu as any).inputField) {
				(this.currentMenu as any).inputField.removeEventListener('input', (this.currentMenu as any).inputHandler);
			}
			
			if ((this.currentMenu as any).keyHandler && (this.currentMenu as any).inputField) {
				(this.currentMenu as any).inputField.removeEventListener('keydown', (this.currentMenu as any).keyHandler);
			}
			
			// Legacy menu key handler (for compatibility)
			if ((this.currentMenu as any).menuKeyHandler) {
				this.currentMenu.removeEventListener('keydown', (this.currentMenu as any).menuKeyHandler);
			}
			
			this.currentMenu.remove();
			this.currentMenu = null;
			this.currentMenuItems = [];
			this.currentFilteredOptions = [];
			this.currentSelectedIndex = 0;
			this.isMenuOpen = false;
			
			// Restore focus to editor
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && activeView.getMode() === 'source') {
				setTimeout(() => {
					const editor = activeView.editor;
					// Force editor focus after menu closes
					(editor as any).focus?.() || (editor as any).cm?.focus?.();
					console.log("🎯 Editor focus restored after menu close");
				}, 10);
			}
			
			console.log("🚪 Interactive menu geschlossen und Editor-Fokus wiederhergestellt");
		}
	}

	onunload() {
		console.log("❌ Slash Plugin entladen");
		this.closeMenu();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SlashMenuSettingTab extends PluginSettingTab {
	plugin: SlashPlugin;

	constructor(app: any, plugin: SlashPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		
		containerEl.createEl('h2', { text: 'Advanced Slash Menu Settings' });

		new Setting(containerEl)
			.setName('Max Menu Items')
			.setDesc('Maximum number of items in slash menu')
			.addSlider(slider => slider
				.setLimits(3, 10, 1)
				.setValue(this.plugin.settings.maxMenuItems)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxMenuItems = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable Mouse Navigation')
			.setDesc('Allow clicking and hovering in menu')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableMouse)
				.onChange(async (value) => {
					this.plugin.settings.enableMouse = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Debug Mode')
			.setDesc('Enable debug console output')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMode)
				.onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
				}));
	}
}
