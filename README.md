# ⚡ Advanced Slash Menu & Notion Sync for Obsidian

![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-purple)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-4.7+-blue)

Transform your Obsidian experience with a powerful slash menu system and seamless Notion integration. This plugin brings modern editor functionality to Obsidian with intelligent command suggestions, performance optimization, and full customization options.

## ✨ Features

### 🎯 Smart Slash Menu
- **Intelligent Search**: Fuzzy search with category filtering
- **Rich Categories**: Text, Lists, Media, Advanced, Notion, and Obsidian commands
- **Performance Optimized**: Lazy loading and caching for large vaults
- **Keyboard Navigation**: Full arrow key and hotkey support
- **Custom Shortcuts**: Configure personalized keyboard shortcuts

### 📡 Notion Integration
- **Seamless Sync**: One-click or automatic file synchronization
- **Metadata Support**: Preserve YAML frontmatter and tags
- **Bulk Operations**: Sync entire vault or selected folders
- **Smart Retry**: Automatic retry with exponential backoff
- **Status Tracking**: Real-time sync status for all files

### 🎨 UX Excellence
- **Multi-Language**: English and German interface
- **Theme Adaptive**: Automatic light/dark theme support
- **Mobile Responsive**: Optimized for all screen sizes
- **Accessibility**: High contrast and reduced motion support
- **Debug Mode**: Performance metrics and troubleshooting tools

## 🚀 Quick Start

### Installation

1. **From Community Plugins** (Recommended)
   - Open Obsidian → Settings → Community Plugins
   - Search for "Advanced Slash Menu"
   - Click Install → Enable

2. **Manual Installation**
   ```bash
   cd your-vault/.obsidian/plugins
   git clone https://github.com/yourusername/obsidian-slash-menu
   cd obsidian-slash-menu
   npm install && npm run build
   ```

### Basic Usage

1. **Open Slash Menu**: Type `/` in any note
2. **Search Commands**: Type to filter available options
3. **Navigate**: Use ↑↓ arrow keys or mouse
4. **Execute**: Press Enter or click to run command

![Slash Menu Demo](demo-slash-menu.gif)

## 📡 Notion Setup

### 1. Create Notion Integration

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Click "New integration"
3. Name your integration (e.g., "Obsidian Sync")
4. Select your workspace
5. Copy the "Internal Integration Token"

### 2. Prepare Database

1. Create a new database in Notion
2. Add these properties:
   - **Title** (Title field)
   - **Content** (Text field)
   - **Tags** (Multi-select field)
   - **Last Modified** (Date field)
   - **Obsidian Path** (Text field)

3. Share database with your integration:
   - Click "Share" in top-right
   - Add your integration
   - Grant full access

### 3. Configure Plugin

1. Open Obsidian → Settings → Advanced Slash Menu
2. Paste your Integration Token
3. Add your Database ID (from database URL)
4. Configure sync preferences

![Notion Setup Demo](demo-notion-setup.gif)

## ⚙️ Configuration

### General Settings

```typescript
{
  language: 'en' | 'de',           // Interface language
  theme: 'auto' | 'light' | 'dark', // Theme preference
  performanceMode: boolean,         // Enable for slower devices
  maxMenuItems: number,            // Limit menu items (5-100)
  debugMode: boolean               // Show performance metrics
}
```

### Category Management

Enable/disable command categories:
- **Text**: Headings, paragraphs, formatting
- **Lists**: Bullets, numbered, tasks, tables
- **Media**: Images, links, embeds, code blocks
- **Advanced**: Templates, queries, calculations
- **Notion**: Sync commands and database operations
- **Obsidian**: Plugin commands and vault operations

### Custom Shortcuts

Customize keyboard shortcuts for frequent commands:

```typescript
{
  heading1: 'Ctrl+1',      // Quick heading 1
  heading2: 'Ctrl+2',      // Quick heading 2
  todo: 'Ctrl+T',          // Quick todo item
  codeblock: 'Ctrl+K',     // Quick code block
  link: 'Ctrl+L'           // Quick link insertion
}
```

### Notion Sync Options

```typescript
{
  syncOnSave: boolean,         // Auto-sync when saving
  autoSync: boolean,           // Periodic background sync
  syncInterval: number,        // Sync frequency (minutes)
  syncMetadata: boolean,       // Include frontmatter/tags
  excludeFolders: string[],    // Folders to skip
  retryAttempts: number        // Failed sync retries
}
```

## 🎮 Usage Examples

### Text Commands
- `/h1` → # Heading 1
- `/h2` → ## Heading 2
- `/bold` → **bold text**
- `/italic` → *italic text*
- `/code` → `inline code`

### List Commands
- `/ul` → • Bullet list
- `/ol` → 1. Numbered list
- `/todo` → - [ ] Task item
- `/table` → | Table | Header |

### Media Commands
- `/img` → ![alt](url) image
- `/link` → [text](url) link
- `/embed` → ![[internal link]]
- `/codeblock` → ```language code block

### Notion Commands
- `/sync` → Sync current file to Notion
- `/sync-all` → Sync entire vault
- `/notion-status` → Check sync status
- `/notion-setup` → Open setup wizard

## 🔧 Troubleshooting

### Common Issues

**Slash menu not appearing**
- Ensure plugin is enabled in Community Plugins
- Check for conflicting plugins
- Try restarting Obsidian

**Notion sync failing**
- Verify integration token is correct
- Check database permissions
- Ensure database has required properties
- Try "Test Connection" in settings

**Performance issues**
- Enable Performance Mode in settings
- Reduce maxMenuItems limit
- Clear cache in settings
- Check Debug Mode for metrics

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 401 | Invalid token | Check integration token |
| 403 | No permission | Share database with integration |
| 404 | Database not found | Verify database ID |
| 429 | Rate limited | Wait and retry |
| 500 | Notion error | Check Notion status |

### Debug Mode

Enable Debug Mode for detailed diagnostics:
- Performance metrics display
- Detailed error logging
- Cache statistics
- Sync operation tracking

## 🛠️ Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/yourusername/obsidian-slash-menu
cd obsidian-slash-menu

# Install dependencies
npm install

# Start development build
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Plugin Architecture

```
src/
├── main.ts              # Main plugin class
├── slash-menu/          # Slash menu system
│   ├── menu.ts         # Menu rendering
│   ├── commands.ts     # Command definitions
│   └── search.ts       # Search/filtering
├── notion/              # Notion integration
│   ├── client.ts       # API client
│   ├── sync.ts         # Sync operations
│   └── mapping.ts      # Content mapping
├── settings/            # Settings management
│   ├── tab.ts          # Settings UI
│   └── types.ts        # Type definitions
└── utils/               # Utility functions
    ├── performance.ts  # Performance optimization
    ├── i18n.ts        # Internationalization
    └── theme.ts       # Theme management
```

### Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Plugin API

Extend functionality with the Slash API:

```typescript
// Register custom command
this.app.plugins.plugins['slash-menu'].registerCommand({
  id: 'my-custom-command',
  label: 'My Custom Command',
  description: 'Does something amazing',
  category: 'Custom',
  handler: (editor, context) => {
    // Your command implementation
  }
});
```

## 📊 Performance

### Benchmarks

| Operation | Time (ms) | Notes |
|-----------|-----------|-------|
| Menu Load | 5-15 | Initial display |
| Search Filter | 1-3 | Per keystroke |
| Command Execute | 2-10 | Depends on complexity |
| Notion Sync | 100-500 | Per file, network dependent |
| Cache Lookup | <1 | Cached commands |

### Optimization Features

- **Lazy Loading**: Commands loaded on demand
- **Intelligent Caching**: LRU cache for frequent operations
- **Performance Mode**: Reduced animations and effects
- **Virtual Scrolling**: Handle large command lists
- **Debounced Search**: Optimized filtering

## 🔒 Privacy & Security

### Data Handling
- **Local First**: All processing happens locally
- **Secure Storage**: Tokens encrypted in Obsidian vault
- **No Telemetry**: No usage data collected
- **Open Source**: Full transparency

### Notion Integration Security
- **API Token**: Stored securely in Obsidian settings
- **Minimal Permissions**: Only database access required
- **HTTPS Only**: All API calls use TLS encryption
- **Rate Limiting**: Respectful API usage

## 🎯 Roadmap

### Version 1.1
- [ ] Custom command templates
- [ ] Advanced search operators
- [ ] Command history and favorites
- [ ] Export/import settings

### Version 1.2
- [ ] Plugin ecosystem integration
- [ ] Advanced Notion formatting
- [ ] Collaborative features
- [ ] Mobile app optimization

### Version 1.3
- [ ] AI-powered suggestions
- [ ] Voice command support
- [ ] Advanced automation
- [ ] Extended language support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Obsidian Team** - For the amazing platform
- **Notion Team** - For the robust API
- **Community** - For feedback and contributions
- **Beta Testers** - For helping polish the experience

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/obsidian-slash-menu/issues)
- **Discussions**: [Community discussion](https://github.com/yourusername/obsidian-slash-menu/discussions)
- **Discord**: [Obsidian Community Discord](https://discord.gg/obsidianmd)
- **Documentation**: [Full documentation](https://docs.example.com/slash-menu)

---

⭐ **Star this repo** if you find it helpful!

[Report Issues](https://github.com/yourusername/obsidian-slash-menu/issues) • [Contribute](CONTRIBUTING.md) • [Changelog](CHANGELOG.md)
