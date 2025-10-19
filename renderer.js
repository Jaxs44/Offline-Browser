const webview = document.getElementById('webview');
const urlBar = document.getElementById('urlBar');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const reloadBtn = document.getElementById('reloadBtn');
const pageCounter = document.getElementById('pageCounter');
const moreBtn = document.getElementById('moreBtn');
const moreMenu = document.getElementById('moreMenu');
const pagesMenu = document.getElementById('pagesMenu');
const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');
const statusBarCheckbox = document.getElementById('statusBarCheckbox');
const fullscreenTrigger = document.getElementById('fullscreenTrigger');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');

// Custom page tracking
let customPages = []; // Array of {url, title} objects
let customCurrentIndex = -1;
let currentZoom = 100;
let hideOverlayTimer = null;
let hasError = false; // Track if last load was an error

// Initialize
webview.addEventListener('dom-ready', () => {
    updateNavigationButtons();
});

let isReloading = false;
let lastNavigatedUrl = '';

webview.addEventListener('did-start-loading', () => {
    console.log('did-start-loading event fired');
    hasError = false; // Clear error flag on new load
    statusText.textContent = 'Loading...';
    if (statusBarCheckbox.checked) {
        statusBar.style.display = 'flex';
    }
});

webview.addEventListener('did-navigate', (e) => {
    // Don't add about:blank to history
    if (e.url === 'about:blank') {
        urlBar.value = '';
        return;
    }
    urlBar.value = e.url;
    // Only add to history if URL actually changed (title will be updated in did-finish-load)
    if (e.url && e.url !== lastNavigatedUrl) {
        addToHistory(e.url, ''); // Add with empty title initially
        lastNavigatedUrl = e.url;
    }
});

webview.addEventListener('did-finish-load', async () => {
    console.log('did-finish-load event fired, hasError:', hasError);
    
    // Get page title and update history
    try {
        const title = await webview.executeJavaScript('document.title');
        if (title && customCurrentIndex >= 0 && customPages[customCurrentIndex]) {
            customPages[customCurrentIndex].title = title;
            updatePagesList(); // Refresh the list with the new title
        }
    } catch (err) {
        console.log('Could not get page title:', err);
    }
    
    // Only update status bar if there was no error (don't overwrite error message)
    if (!hasError) {
        updateStatusBar();
    }
});

webview.addEventListener('did-fail-load', (e) => {
    console.log('did-fail-load event:', e.errorCode, e.errorDescription, e.validatedURL);
    // Show error for all failures except abort (-3)
    if (e.errorCode !== -3 && e.validatedURL) {
        hasError = true; // Set error flag
        const errorMsg = `❌ Failed: ${e.errorDescription || 'Unknown Error'} (Code: ${e.errorCode})`;
        statusText.textContent = errorMsg;
        console.log('Error displayed in status bar:', errorMsg);
        statusBar.style.display = 'flex'; // Ensure status bar is visible
    }
});

async function updateStatusBar() {
    let status = 'Ready';
    
    // JS state
    if (!jsCheckbox.checked) {
        status += ' | ⚠️ JavaScript Disabled';
    }
    
    // Zoom level
    if (currentZoom !== 100) {
        status += ` | 🔍 ${currentZoom}%`;
    }
    
    // Download location
    const downloadPath = await window.electronAPI.getDownloadPath();
    if (downloadPath) {
        status += ` | 💾 ${downloadPath}`;
    }
    
    statusText.textContent = status;
}

webview.addEventListener('did-navigate-in-page', (e) => {
    if (e.isMainFrame) {
        urlBar.value = e.url;
    }
});

// URL bar
urlBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        navigateTo(urlBar.value);
    }
});

function navigateTo(url) {
    if (!url) return;
    
    // Handle file:// or add it if it's a path
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
        url = 'file://' + url;
    }
    
    webview.src = url;
    // Don't add to history here - did-navigate event will handle it
}

function addToHistory(url, title = '') {
    // Don't add about:blank
    if (url === 'about:blank') {
        return;
    }
    
    // Use URL as title if no title provided
    if (!title) {
        title = url;
    }
    
    // Don't add if it's the same as current page (prevents duplicates on reload)
    if (customCurrentIndex >= 0 && customPages[customCurrentIndex] && customPages[customCurrentIndex].url === url) {
        return;
    }
    
    // Check if this URL already exists anywhere in history
    const existingIndex = customPages.findIndex(p => p.url === url);
    if (existingIndex !== -1) {
        // Remove the duplicate
        customPages.splice(existingIndex, 1);
        // Adjust current index if needed
        if (customCurrentIndex > existingIndex) {
            customCurrentIndex--;
        } else if (customCurrentIndex === existingIndex) {
            customCurrentIndex--;
        }
    }
    
    // Add the new page at the end
    customPages.push({ url, title });
    customCurrentIndex = customPages.length - 1;
    
    // Clean any about:blank entries that might have snuck in
    cleanAboutBlankFromHistory();
    
    updateNavigationButtons();
    updatePageCounter();
}

function cleanAboutBlankFromHistory() {
    const oldLength = customPages.length;
    customPages = customPages.filter(p => p.url !== 'about:blank');
    
    // Adjust current index if items were removed
    if (customPages.length < oldLength && customCurrentIndex >= customPages.length) {
        customCurrentIndex = Math.max(0, customPages.length - 1);
    }
}

// Navigation buttons
backBtn.addEventListener('click', () => {
    if (customCurrentIndex > 0 && customPages.length > 0) {
        customCurrentIndex--;
        const url = customPages[customCurrentIndex].url;
        webview.src = url;
        lastNavigatedUrl = url;
        updateNavigationButtons();
        updatePageCounter();
    }
});

forwardBtn.addEventListener('click', () => {
    if (customCurrentIndex < customPages.length - 1 && customPages.length > 0) {
        customCurrentIndex++;
        const url = customPages[customCurrentIndex].url;
        webview.src = url;
        lastNavigatedUrl = url;
        updateNavigationButtons();
        updatePageCounter();
    }
});

reloadBtn.addEventListener('click', () => {
    isReloading = true;
    webview.reload();
});

function updateNavigationButtons() {
    backBtn.disabled = customCurrentIndex <= 0 || customPages.length === 0;
    forwardBtn.disabled = customCurrentIndex >= customPages.length - 1 || customPages.length === 0;
    reloadBtn.disabled = customPages.length === 0;
}

function updatePageCounter() {
    if (customPages.length === 0) {
        pageCounter.textContent = '0 of 0';
    } else {
        pageCounter.textContent = `${customCurrentIndex + 1} of ${customPages.length}`;
    }
}

// Open file
document.getElementById('openBtn').addEventListener('click', async () => {
    const filePath = await window.electronAPI.openFile();
    if (filePath) {
        navigateTo(filePath);
    }
});

// Pages menu
const pagesList = document.getElementById('pagesList');

document.getElementById('pagesBtn').addEventListener('click', () => {
    pagesMenu.classList.toggle('hidden');
    if (!pagesMenu.classList.contains('hidden')) {
        updatePagesList();
    }
});

function updatePagesList() {
    pagesList.innerHTML = '';
    if (customPages.length === 0) {
        pagesList.innerHTML = '<div style="padding: 10px; color: #888;">No pages in history</div>';
        return;
    }
    
    customPages.forEach((page, index) => {
        const item = document.createElement('div');
        item.className = 'page-item' + (index === customCurrentIndex ? ' active' : '');
        
        const text = document.createElement('span');
        // Show title if different from URL, otherwise just URL
        if (page.title && page.title !== page.url) {
            text.textContent = `${index + 1}. ${page.title} | ${page.url}`;
        } else {
            text.textContent = `${index + 1}. ${page.url}`;
        }
        text.title = page.url; // Show full path on hover
        text.addEventListener('click', () => {
            customCurrentIndex = index;
            const url = customPages[index].url;
            webview.src = url;
            lastNavigatedUrl = url;
            updateNavigationButtons();
            updatePageCounter();
            pagesMenu.classList.add('hidden');
        });
        
        const duplicateBtn = document.createElement('button');
        duplicateBtn.textContent = '🗗';
        duplicateBtn.className = 'duplicate-btn';
        duplicateBtn.title = 'Duplicate to New Window';
        duplicateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.electronAPI.duplicateWindowWithUrl(page.url);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePage(index);
        });
        
        item.appendChild(text);
        item.appendChild(duplicateBtn);
        item.appendChild(deleteBtn);
        pagesList.appendChild(item);
    });
}

function deletePage(index) {
    if (customPages.length === 0) return;
    
    // Remember what page we're currently viewing
    const currentUrl = customCurrentIndex >= 0 ? customPages[customCurrentIndex].url : null;
    
    customPages.splice(index, 1);
    
    if (customPages.length === 0) {
        customCurrentIndex = -1;
        lastNavigatedUrl = '';
        urlBar.value = '';
        
        // Stop any loading and clear
        webview.stop();
        webview.src = 'about:blank';
        
        // Blank view with fade animation
        webview.style.opacity = '0';
        setTimeout(() => {
            webview.style.opacity = '1';
        }, 100);
    } else if (customCurrentIndex >= customPages.length) {
        // If current index is out of bounds, go to new last page
        customCurrentIndex = customPages.length - 1;
        webview.src = customPages[customCurrentIndex].url;
        lastNavigatedUrl = customPages[customCurrentIndex].url;
    } else if (customCurrentIndex === index) {
        // If we deleted the current page, go to the next one (or previous if last)
        customCurrentIndex = Math.min(index, customPages.length - 1);
        webview.src = customPages[customCurrentIndex].url;
        lastNavigatedUrl = customPages[customCurrentIndex].url;
    } else if (customCurrentIndex > index) {
        // If we deleted a page before current, adjust index and stay on same page
        customCurrentIndex--;
        // No need to reload - we're still on the same URL, just at a different index
    }
    // If we deleted a page after current, no index change needed
    
    updateNavigationButtons();
    updatePageCounter();
    updatePagesList();
}

// More menu
moreBtn.addEventListener('click', () => {
    moreMenu.classList.toggle('hidden');
    const advancedSubmenu = document.getElementById('advancedSubmenu');
    advancedSubmenu.classList.add('hidden'); // Close submenu if open
});

// Advanced submenu toggle
const advancedBtn = document.getElementById('advancedBtn');
const advancedSubmenu = document.getElementById('advancedSubmenu');

advancedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    advancedSubmenu.classList.toggle('hidden');
});

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!moreBtn.contains(e.target) && !moreMenu.contains(e.target)) {
        moreMenu.classList.add('hidden');
        const advancedSubmenu = document.getElementById('advancedSubmenu');
        advancedSubmenu.classList.add('hidden');
    }
    const pagesBtn = document.getElementById('pagesBtn');
    if (!pagesBtn.contains(e.target) && !pagesMenu.contains(e.target)) {
        pagesMenu.classList.add('hidden');
    }
});

// Fullscreen - THE EASY WAY!
let wasMaximized = false;

document.getElementById('fullscreenBtn').addEventListener('click', () => {
    const isFullscreen = document.body.classList.contains('fullscreen');
    
    if (!isFullscreen) {
        // Enter fullscreen
        wasMaximized = window.electronAPI.isMaximized ? window.electronAPI.isMaximized() : false;
        window.electronAPI.setFullscreen(true);
        document.body.classList.add('fullscreen');
        showFullscreenOverlay();
        startHideTimer();
    } else {
        // Exit fullscreen
        window.electronAPI.setFullscreen(false);
        document.body.classList.remove('fullscreen');
        hideFullscreenOverlay();
    }
    
    moreMenu.classList.add('hidden');
});

fullscreenTrigger.addEventListener('mouseenter', () => {
    showFullscreenOverlay();
    startHideTimer();
});

exitFullscreenBtn.addEventListener('click', () => {
    window.electronAPI.setFullscreen(false);
    document.body.classList.remove('fullscreen');
    hideFullscreenOverlay();
});

fullscreenOverlay.addEventListener('mouseenter', () => {
    clearTimeout(hideOverlayTimer);
});

fullscreenOverlay.addEventListener('mouseleave', () => {
    startHideTimer();
});

function showFullscreenOverlay() {
    fullscreenOverlay.classList.remove('hidden');
    // Trigger reflow for animation
    fullscreenOverlay.offsetHeight;
    fullscreenOverlay.classList.add('show');
}

function hideFullscreenOverlay() {
    fullscreenOverlay.classList.remove('show');
    setTimeout(() => {
        fullscreenOverlay.classList.add('hidden');
    }, 300);
}

function startHideTimer() {
    clearTimeout(hideOverlayTimer);
    hideOverlayTimer = setTimeout(() => {
        hideFullscreenOverlay();
    }, 3000);
}

// ESC to exit fullscreen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('fullscreen')) {
        window.electronAPI.setFullscreen(false);
        document.body.classList.remove('fullscreen');
        hideFullscreenOverlay();
    }
});

// View Source - Toggle DevTools
document.getElementById('viewSourceBtn').addEventListener('click', async () => {
    try {
        const isOpen = await window.electronAPI.toggleDevTools();
        statusText.textContent = isOpen ? '✅ DevTools opened' : '✅ DevTools closed';
        statusBar.style.display = 'flex';
        console.log('DevTools toggled:', isOpen);
        
        setTimeout(() => {
            if (statusText.textContent.includes('DevTools')) {
                updateStatusBar();
            }
        }, 2000);
    } catch (err) {
        console.error('DevTools toggle error:', err);
        statusText.textContent = `❌ DevTools failed: ${err.message}`;
        statusBar.style.display = 'flex';
    }
    document.getElementById('advancedSubmenu').classList.add('hidden');
    moreMenu.classList.add('hidden');
});

// Mute button
const muteBtn = document.getElementById('muteBtn');
let isMuted = false;
if (muteBtn) {
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        webview.setAudioMuted(isMuted);
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
        muteBtn.title = isMuted ? 'Unmute' : 'Mute';
        console.log('Audio muted:', isMuted);
    });
}

// New Blank Window (toolbar button)
const blankWindowBtn = document.getElementById('blankWindowBtn');
if (blankWindowBtn) {
    blankWindowBtn.addEventListener('click', () => {
        console.log('New blank window clicked');
        try {
            window.electronAPI.duplicateWindow(); // Opens blank window
        } catch (err) {
            console.error('New window error:', err);
        }
    });
} else {
    console.error('blankWindowBtn not found in DOM');
}

// Duplicate Current Page (toolbar button)
const duplicatePageBtn = document.getElementById('duplicatePageBtn');
if (duplicatePageBtn) {
    duplicatePageBtn.addEventListener('click', () => {
        console.log('Duplicate page clicked');
        const currentUrl = webview.src;
        if (currentUrl && currentUrl !== 'about:blank') {
            try {
                window.electronAPI.duplicateWindowWithUrl(currentUrl);
            } catch (err) {
                console.error('Duplicate page error:', err);
            }
        } else {
            console.log('No page to duplicate');
        }
    });
} else {
    console.error('duplicatePageBtn not found in DOM');
}

// JavaScript toggle
const jsCheckbox = document.getElementById('jsCheckbox');
const jsLabel = document.getElementById('jsLabel');
jsCheckbox.addEventListener('change', (e) => {
    const checkmark = jsCheckbox.parentElement.querySelector('.checkmark');
    checkmark.textContent = e.target.checked ? '\u2713' : '';
    jsLabel.textContent = e.target.checked ? 'JavaScript Enabled' : 'JavaScript Disabled';
    
    if (webview.src && webview.src !== 'about:blank') {
        // Reload page with new JS setting
        isReloading = true;
        webview.reload();
    }
    
    updateStatusBar();
});

// Block JavaScript by intercepting before page loads
webview.addEventListener('will-navigate', (e) => {
    if (!jsCheckbox.checked) {
        // Inject script to disable JS immediately as page starts loading
        webview.executeJavaScript(`
            // Create meta tag to disable scripts via CSP
            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = "script-src 'none'";
            document.head.insertBefore(meta, document.head.firstChild);
        `).catch(() => {});
    }
});

// Additional blocking at dom-ready as backup
webview.addEventListener('dom-ready', () => {
    if (!jsCheckbox.checked) {
        webview.executeJavaScript(`
            // Remove all script tags
            document.querySelectorAll('script').forEach(s => s.remove());
            
            // Remove inline event handlers
            const allElements = document.querySelectorAll('*');
            allElements.forEach(el => {
                const attributes = el.attributes;
                for (let i = attributes.length - 1; i >= 0; i--) {
                    const attr = attributes[i];
                    if (attr.name.startsWith('on')) {
                        el.removeAttribute(attr.name);
                    }
                }
            });
            
            // Override common JS methods to prevent execution
            window.eval = function() { return null; };
            window.Function = function() { return function() {}; };
            window.setTimeout = function() { return 0; };
            window.setInterval = function() { return 0; };
        `).catch(err => console.log('JS disable error:', err));
    }
});

// Zoom
document.getElementById('zoomInBtn').addEventListener('click', () => {
    if (!webview.src || webview.src === 'about:blank') {
        console.log('Cannot zoom: No page loaded');
        return;
    }
    const oldZoom = currentZoom;
    currentZoom = Math.min(500, currentZoom + 10); // Max 500%
    console.log(`Zoom In: ${oldZoom}% -> ${currentZoom}%`);
    try {
        webview.setZoomFactor(currentZoom / 100);
        updateZoomDisplay();
    } catch (err) {
        console.error('Zoom error:', err);
    }
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
    if (!webview.src || webview.src === 'about:blank') {
        console.log('Cannot zoom: No page loaded');
        return;
    }
    const oldZoom = currentZoom;
    currentZoom = Math.max(10, currentZoom - 10); // Min 10%
    console.log(`Zoom Out: ${oldZoom}% -> ${currentZoom}%`);
    try {
        webview.setZoomFactor(currentZoom / 100);
        updateZoomDisplay();
    } catch (err) {
        console.error('Zoom error:', err);
    }
});

document.getElementById('zoomResetBtn').addEventListener('click', () => {
    if (!webview.src || webview.src === 'about:blank') {
        console.log('Cannot zoom: No page loaded');
        return;
    }
    const oldZoom = currentZoom;
    currentZoom = 100;
    console.log(`Zoom Reset: ${oldZoom}% -> ${currentZoom}%`);
    try {
        webview.setZoomFactor(1);
        updateZoomDisplay();
    } catch (err) {
        console.error('Zoom error:', err);
    }
});

function updateZoomDisplay() {
    document.getElementById('zoomResetBtn').textContent = `🔍 Reset Zoom (${currentZoom}%)`;
    console.log('Zoom display updated:', currentZoom + '%');
    updateStatusBar();
}

// Status bar
statusBarCheckbox.addEventListener('change', (e) => {
    const checkmark = statusBarCheckbox.parentElement.querySelector('.checkmark');
    checkmark.textContent = e.target.checked ? '✓' : '';
    statusBar.classList.toggle('hidden', !e.target.checked);
});

// Screenshot
document.getElementById('screenshotBtn').addEventListener('click', async () => {
    try {
        console.log('Screenshot button clicked');
        
        // Show save dialog first
        const savePath = await window.electronAPI.saveScreenshotDialog();
        console.log('Save dialog result:', savePath);
        
        if (!savePath) {
            console.log('Screenshot cancelled by user');
            moreMenu.classList.add('hidden');
            return;
        }
        
        statusText.textContent = '📸 Taking screenshot...';
        statusBar.style.display = 'flex';
        
        // Take and save screenshot of webview content only
        const result = await window.electronAPI.takeScreenshot(savePath);
        console.log('Screenshot result:', result);
        
        if (result.success) {
            statusText.textContent = `✅ Screenshot saved: ${result.filename}`;
            statusBar.style.display = 'flex';
            console.log('Screenshot saved to:', result.path);
            
            setTimeout(() => {
                if (statusText.textContent.includes('Screenshot saved')) {
                    updateStatusBar();
                }
            }, 3000);
        } else {
            throw new Error(result.error);
        }
    } catch (err) {
        console.error('Screenshot error:', err);
        statusText.textContent = `❌ Screenshot failed: ${err.message}`;
        statusBar.style.display = 'flex';
    }
    moreMenu.classList.add('hidden');
});

// Download Path
document.getElementById('downloadPathBtn').addEventListener('click', async () => {
    const newPath = await window.electronAPI.setDownloadPath();
    if (newPath) {
        statusText.textContent = `✅ Download path set: ${newPath}`;
        statusBar.style.display = 'flex';
        setTimeout(() => {
            if (statusText.textContent.includes('Download path set')) {
                updateStatusBar();
            }
        }, 3000);
    }
    moreMenu.classList.add('hidden');
});

// Force Error Test for debugging
document.getElementById('forceErrorBtn').addEventListener('click', () => {
    if (confirm('This will attempt to load an invalid file to test error handling. Continue?')) {
        const errorUrl = 'file:///C:/NONEXISTENT-ERROR-TEST-' + Date.now() + '.html';
        console.log('Force Error Test: Attempting to load:', errorUrl);
        statusText.textContent = '⏳ Loading invalid file...';
        statusBar.style.display = 'flex'; // Ensure status bar visible
        webview.src = errorUrl;
    }
    advancedMenu.classList.add('hidden');
});

// Clear history
document.getElementById('clearHistoryBtn').addEventListener('click', () => {
    if (confirm('Clear all browsing history?')) {
        customPages = [];
        customCurrentIndex = -1;
        lastNavigatedUrl = '';
        urlBar.value = '';
        
        // Full nuke - stop everything and clear
        webview.stop();
        webview.src = 'about:blank';
        
        // Fade effect
        webview.style.opacity = '0';
        setTimeout(() => {
            webview.style.opacity = '1';
        }, 100);
        
        updateNavigationButtons();
        updatePageCounter();
        updateStatusBar();
        
        // Close pages menu if open
        pagesMenu.classList.add('hidden');
    }
    advancedMenu.classList.add('hidden');
});

// Initialize status bar
updateStatusBar();

// Listen for URL to load (when duplicating with URL)
window.electronAPI.onLoadUrl((url) => {
    console.log('Received URL to load:', url);
    webview.src = url;
});

// Custom title bar controls
document.getElementById('helpTitleBtn').addEventListener('click', () => {
    window.electronAPI.showAbout();
});

document.getElementById('minimizeBtn').addEventListener('click', () => {
    window.electronAPI.windowMinimize();
});

document.getElementById('maximizeBtn').addEventListener('click', () => {
    window.electronAPI.windowMaximize();
});

document.getElementById('closeBtn').addEventListener('click', () => {
    window.electronAPI.windowClose();
});

// Help/About button (toolbar - removed but keeping handler for compatibility)
const helpBtn = document.getElementById('helpBtn');
if (helpBtn) {
    helpBtn.addEventListener('click', () => {
        window.electronAPI.showAbout();
    });
}

console.log('Offline Browser ready!');
