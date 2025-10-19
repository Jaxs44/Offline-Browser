# Offline Testing Browser

An advanced offline HTML browser built with Electron, designed for testing and viewing local HTML files with comprehensive controls and features.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-CC%20BY%204.0-green)
![Electron](https://img.shields.io/badge/electron-38.3.0-brightgreen)

## Features

### Core Functionality
- **Full Navigation Controls**: Back, Forward, Reload with page counter
- **Page History with Titles**: View and manage visited pages with automatic title detection
- **Multiple Windows**: Duplicate pages to new windows for side-by-side testing
- **Custom Title Bar**: Windows-style title bar with integrated help button

### Testing & Development
- **JavaScript Toggle**: Enable/disable JavaScript execution with CSP-based blocking
- **Developer Tools**: Built-in Chrome DevTools for debugging
- **Status Bar**: Real-time display of JS state, zoom level, and download path
- **Error Handling**: Graceful error pages for failed loads

### Visual & Media Controls
- **Fullscreen Mode**: Auto-hiding overlay toolbar (3-second timer)
- **Zoom**: 10-500% zoom range with keyboard shortcuts and UI controls
- **Audio Mute**: Toggle audio on/off for all media
- **Screenshot Capture**: Save webview screenshots (UI-free) to Downloads folder

### User Interface
- **Custom Icons**: Unique, semantic icons for all controls (including DALL-E custom app icon)
- **Comprehensive Tooltips**: Hover help for all buttons and controls
- **Organized Menus**: More menu with Advanced submenu for power features
- **Duplicate & Delete**: Manage page history with quick actions

## Screenshots

### Main Interface
The browser features a clean, modern interface with custom title bar and comprehensive toolbar.

### Page History
View all visited pages with titles displayed in `[Title | URL]` format. Duplicate or delete pages easily.

### Fullscreen Mode
Auto-hiding overlay appears for 3 seconds in fullscreen mode for distraction-free viewing.

## Installation

### Download Pre-built Executable
1. Go to the [Releases](../../releases) page
2. Download the latest `Offline.Browser.1.0.0.exe` (approximately 77-81 MB)
3. Run the executable - no installation required!

**Note:** Windows may show a security warning since the app isn't signed. Click "More info" → "Run anyway" to proceed.

### Build from Source

#### Prerequisites
- Node.js v22.20.0 or later
- npm 10.9.3 or later

#### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/offline-browser.git
   cd offline-browser
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm start
   ```

4. Build the executable:
   ```bash
   npm run build
   ```

The portable executable will be created in the `dist` folder.

## Usage

### Opening Files
- Click the **Open** button (📂) or use the toolbar
- Browse to select any HTML file
- The file opens in the embedded webview

### Navigation
- **Back** (◀): Navigate to previous page
- **Forward** (▶): Navigate to next page
- **Reload** (🔄): Refresh current page
- **Counter**: Shows current position in history

### Page Management
- **Pages** (📋): View history with titles and URLs
- **Duplicate** (🗔 green button): Open page in new window
- **Delete** (✕ red button): Remove page from history
- **Blank** (🗔): Open new blank window

### Advanced Features
Access via **More** (☰) menu:
- **Fullscreen** (🖥️): Toggle fullscreen mode
- **JavaScript**: Enable/disable JS execution
- **Screenshot** (📸): Capture current webview
- **Zoom** (🔍+/🔍−): Increase/decrease zoom
- **Reset Zoom** (🔍): Return to 100%
- **Download Path** (📁): Set screenshot save location
- **Status Bar**: Toggle status information display
- **Advanced** (⚙️):
  - **DevTools** (🔍): Open Chrome DevTools
  - **Clear History** (🧹): Reset page history
  - **Force Error Test** (⚠️): Test error handling

### Keyboard Shortcuts
- `F11`: Toggle fullscreen
- Mouse hover in fullscreen: Show toolbar overlay

### Custom Title Bar
- **?**: Show About dialog with version and features
- **─**: Minimize window
- **□**: Maximize/Restore window
- **✕**: Close window

## Technical Details

### Architecture
- **Main Process** (`main.js`): Window management, IPC handlers, native dialogs
- **Renderer Process** (`renderer.js`): Browser logic, UI controls, page tracking
- **Preload Script** (`preload.js`): Secure IPC bridge via contextBridge
- **Webview**: Isolated content rendering with nodeintegration disabled

### Key Technologies
- **Electron 38.3.0**: Cross-platform desktop framework
- **Node.js 22.20.0**: JavaScript runtime
- **electron-builder 26.0.12**: Executable packaging
- **Sharp 0.34.4**: Image processing for screenshots

### JavaScript Blocking Implementation
Two-phase blocking system:
1. **will-navigate**: Injects CSP meta tag (`script-src 'none'`)
2. **dom-ready**: Removes script tags and overrides eval/setTimeout/setInterval

### Screenshot Implementation
Captures webview's guest webContents directly (excludes UI elements), saves to Downloads folder by default for portable executable compatibility.

### Page Tracking
Uses `{url, title}` objects instead of plain URLs. Titles fetched via `executeJavaScript('document.title')` on page load. Duplicate URLs automatically removed before adding new entries.

## Test Files

The project includes 8 focused test files in the root directory:
- `test-fullscreen.html`: Purple gradient for fullscreen overlay testing
- `test-javascript.html`: Pink gradient with interactive counter for JS toggle
- `test-zoom.html`: Green gradient with various sizes for zoom testing
- `test-audio.html`: Web Audio API tone generator for mute testing
- `test-screenshot.html`: Colorful elements for screenshot testing
- `test-navigation.html`, `test-navigation2.html`, `test-navigation3.html`: Three-page navigation suite

## Project Structure

```
offline-browser/
├── main.js                 # Main process (221 lines)
├── preload.js              # Preload script (17 lines)
├── renderer.js             # Renderer process (~745 lines)
├── index.html              # UI structure (78 lines)
├── styles.css              # Styling (~349 lines)
├── package.json            # Project metadata
├── dalle-icon.webp         # Source icon (DALL-E generated)
├── icon.png                # App icon (512x512)
├── icon-256.png            # App icon (256x256)
├── test-*.html             # Test files (8 total)
└── dist/                   # Build output
    └── Offline Browser 1.0.0.exe
```

## Development

### IPC Handlers (13 total)
- `open-file`: Open file dialog
- `duplicate-window`: Create new window
- `duplicate-window-with-url`: Create window with specific URL
- `set-fullscreen`: Toggle fullscreen state
- `is-maximized`: Check window state
- `toggle-devtools`: Show/hide DevTools
- `save-screenshot-dialog`: Save screenshot dialog
- `take-screenshot`: Capture webview content
- `get-download-path`: Get current download location
- `set-download-path`: Change download location
- `show-about`: Display About dialog
- `window-minimize/maximize/close`: Custom title bar controls

### Webview Events
- `did-start-loading`: Show loading indicator
- `did-navigate`: Update URL bar, track history
- `did-finish-load`: Fetch page title, hide loading
- `did-fail-load`: Show error page
- `will-navigate`: Inject CSP for JS blocking
- `dom-ready`: Remove scripts and disable JS functions

## Known Issues

- Virus scanners may temporarily lock the output file during build (auto-resolves)
- Custom title bar may need Windows-specific styling adjustments on other platforms

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** license.

You are free to:
- **Share**: Copy and redistribute the material in any medium or format
- **Adapt**: Remix, transform, and build upon the material for any purpose, even commercially

Under the following terms:
- **Attribution**: You must give appropriate credit, provide a link to the license, and indicate if changes were made

See [LICENSE](LICENSE) for the full license text or visit https://creativecommons.org/licenses/by/4.0/

## Author

**Jaxs the Fox**

## Acknowledgments

- App icon created with DALL-E (fox and portal design)
- Built with Electron framework
- Inspired by the need for a robust offline HTML testing tool

---

**Version**: 1.0.0  
**Built with**: Electron 38.3.0  
**Node.js**: 22.20.0
