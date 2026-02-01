interface HighlightPosition {
  text: string;
  xpath: string;
  startOffset: number;
  endOffset: number;
  beforeContext: string;
  afterContext: string;
  id: string;
  createdAt: number;
}

interface PageHighlights {
  url: string;
  highlights: HighlightPosition[];
}

// Tab switching
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = (tab as HTMLElement).dataset.tab;
    
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(`${targetTab}-panel`)?.classList.add('active');
    
    if (targetTab === 'current') {
      loadCurrentPageHighlights();
    } else {
      loadAllHighlights();
    }
  });
});

// Format date
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Truncate text
function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Create highlight item element
function createHighlightElement(highlight: HighlightPosition, url?: string): HTMLElement {
  const item = document.createElement('div');
  item.className = 'highlight-item';
  item.dataset.highlightId = highlight.id;
  
  const textDiv = document.createElement('div');
  textDiv.className = 'highlight-text';
  textDiv.textContent = truncateText(highlight.text, 150);
  
  const metaDiv = document.createElement('div');
  metaDiv.className = 'highlight-meta';
  
  const dateSpan = document.createElement('span');
  dateSpan.className = 'highlight-date';
  dateSpan.textContent = formatDate(highlight.createdAt);
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => deleteHighlight(highlight.id, url));
  
  metaDiv.appendChild(dateSpan);
  metaDiv.appendChild(deleteBtn);
  
  item.appendChild(textDiv);
  
  if (url) {
    const urlLink = document.createElement('a');
    urlLink.className = 'highlight-url';
    urlLink.href = url;
    urlLink.textContent = new URL(url).hostname + new URL(url).pathname;
    urlLink.title = url;
    urlLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url });
    });
    item.appendChild(urlLink);
  }
  
  item.appendChild(metaDiv);
  
  return item;
}

// Load current page highlights
async function loadCurrentPageHighlights(): Promise<void> {
  const container = document.getElementById('current-list');
  if (!container) return;
  
  // Get current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔒</div>
        <p>Cannot access this page</p>
      </div>
    `;
    return;
  }
  
  const highlights = await new Promise<HighlightPosition[]>((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'getHighlights', url: tab.url },
      (response) => resolve(response || [])
    );
  });
  
  if (highlights.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>No highlights on this page yet</p>
        <p style="font-size: 12px; margin-top: 8px;">Select text and right-click to save</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  highlights.forEach(h => {
    container.appendChild(createHighlightElement(h));
  });
}

// Load all highlights across all pages
async function loadAllHighlights(): Promise<void> {
  const container = document.getElementById('all-list');
  if (!container) return;
  
  const pages = await new Promise<PageHighlights[]>((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'getAllHighlights' },
      (response) => resolve(response || [])
    );
  });
  
  const allHighlights = pages.flatMap(p => 
    p.highlights.map(h => ({ ...h, url: p.url }))
  );
  
  if (allHighlights.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>No highlights saved yet</p>
      </div>
    `;
    return;
  }
  
  // Sort by date, newest first
  allHighlights.sort((a, b) => b.createdAt - a.createdAt);
  
  container.innerHTML = '';
  
  // Group by page
  const groupedByPage = new Map<string, Array<HighlightPosition & { url: string }>>();
  allHighlights.forEach(h => {
    const existing = groupedByPage.get(h.url) || [];
    existing.push(h);
    groupedByPage.set(h.url, existing);
  });
  
  groupedByPage.forEach((highlights, url) => {
    const group = document.createElement('div');
    group.className = 'page-group';
    
    const header = document.createElement('div');
    header.className = 'page-group-header';
    try {
      header.textContent = new URL(url).hostname + new URL(url).pathname;
    } catch {
      header.textContent = url;
    }
    group.appendChild(header);
    
    highlights.forEach(h => {
      group.appendChild(createHighlightElement(h, url));
    });
    
    container.appendChild(group);
  });
}

// Delete highlight
async function deleteHighlight(highlightId: string, url?: string): Promise<void> {
  // Get URL if not provided
  if (!url) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    url = tab?.url;
  }
  
  if (!url) return;
  
  // Remove from storage
  await new Promise<void>((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'removeHighlightData', url, highlightId },
      () => resolve()
    );
  });
  
  // Remove from DOM
  const item = document.querySelector(`[data-highlight-id="${highlightId}"]`);
  item?.remove();
  
  // Notify content script to remove highlight
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'refreshHighlights' });
  }
  
  // Refresh current view
  if (document.querySelector('.tab.active')?.getAttribute('data-tab') === 'current') {
    loadCurrentPageHighlights();
  } else {
    loadAllHighlights();
  }
}

// Initial load
loadCurrentPageHighlights();

// Listen for storage changes
chrome.storage.onChanged.addListener(() => {
  if (document.querySelector('.tab.active')?.getAttribute('data-tab') === 'current') {
    loadCurrentPageHighlights();
  } else {
    loadAllHighlights();
  }
});
