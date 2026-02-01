export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    // Inject highlight styles
    injectHighlightStyles();

    // Load and apply existing highlights
    loadAndApplyHighlights();

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'saveHighlight') {
        handleSaveHighlight();
      } else if (message.action === 'removeHighlight') {
        handleRemoveHighlight();
      } else if (message.action === 'refreshHighlights') {
        loadAndApplyHighlights();
      }
    });

    // Add click listener for highlight removal
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains(HIGHLIGHT_CLASS) && e.altKey) {
        const highlightId = target.dataset.highlightId;
        if (highlightId) {
          removeHighlightById(highlightId);
        }
      }
    });
  }
});

const HIGHLIGHT_CLASS = 'text-highlighter-extension-mark';

function injectHighlightStyles(): void {
  if (document.getElementById('text-highlighter-styles')) return;

  const style = document.createElement('style');
  style.id = 'text-highlighter-styles';
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      background-color: #ffeb3b !important;
      border-radius: 2px;
      padding: 0 2px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .${HIGHLIGHT_CLASS}:hover {
      background-color: #ffc107 !important;
    }
  `;
  document.head.appendChild(style);
}

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

async function loadAndApplyHighlights(): Promise<void> {
  const url = window.location.href;
  
  const highlights = await new Promise<HighlightPosition[]>((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'getHighlights', url },
      (response) => resolve(response || [])
    );
  });

  for (const highlight of highlights) {
    applyHighlight(highlight);
  }
}

async function handleSaveHighlight(): Promise<void> {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    return;
  }

  const highlightData = createHighlightFromSelection(selection);
  if (!highlightData) return;

  // First highlight in the DOM
  const success = highlightSelection(selection, highlightData.id);
  if (!success) return;

  // Then save to storage
  chrome.runtime.sendMessage({
    action: 'saveHighlightData',
    url: window.location.href,
    highlight: highlightData
  });

  // Clear selection
  selection.removeAllRanges();
}

function handleRemoveHighlight(): void {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  // Find if selection is within a highlight
  const range = selection.getRangeAt(0);
  let node: Node | null = range.commonAncestorContainer;
  
  while (node && node !== document.body) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.classList.contains(HIGHLIGHT_CLASS)) {
        const highlightId = el.dataset.highlightId;
        if (highlightId) {
          removeHighlightById(highlightId);
          return;
        }
      }
    }
    node = node.parentNode;
  }
}

async function removeHighlightById(highlightId: string): Promise<void> {
  // Remove from DOM
  const mark = document.querySelector(`[data-highlight-id="${highlightId}"]`);
  if (mark) {
    const parent = mark.parentNode;
    while (mark.firstChild) {
      parent?.insertBefore(mark.firstChild, mark);
    }
    mark.remove();
    parent?.normalize();
  }

  // Remove from storage
  chrome.runtime.sendMessage({
    action: 'removeHighlightData',
    url: window.location.href,
    highlightId
  });
}

// Get XPath for an element
function getXPath(element: Node): string {
  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentNode!;
  }

  if (element.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = element as Element;

  if (el.id) {
    return `//*[@id="${el.id}"]`;
  }

  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousSibling;

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE &&
        (sibling as Element).tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.tagName.toLowerCase();
    parts.unshift(`${tagName}[${index}]`);
    current = current.parentElement;
  }

  return '/' + parts.join('/');
}

// Get element by XPath
function getElementByXPath(xpath: string): Element | null {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue as Element;
  } catch {
    return null;
  }
}

// Create highlight position data from selection
function createHighlightFromSelection(selection: Selection): HighlightPosition | null {
  if (!selection.rangeCount || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  const text = selection.toString().trim();

  if (!text) return null;

  const container = range.commonAncestorContainer;
  const xpath = getXPath(container);

  // Get surrounding context for verification
  const containerText = container.textContent || '';
  const textStart = containerText.indexOf(text);
  const beforeContext = containerText.substring(Math.max(0, textStart - 50), textStart);
  const afterContext = containerText.substring(textStart + text.length, textStart + text.length + 50);

  // Calculate offset within the container
  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = preRange.toString().length;

  return {
    id: `hl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    text,
    xpath,
    startOffset,
    endOffset: startOffset + text.length,
    beforeContext,
    afterContext,
    createdAt: Date.now()
  };
}

// Apply highlight from stored position
function applyHighlight(position: HighlightPosition): boolean {
  const container = getElementByXPath(position.xpath);
  if (!container) return false;

  // Use TreeWalker to find all text nodes
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentOffset = 0;
  let startNode: Text | null = null;
  let startNodeOffset = 0;
  let endNode: Text | null = null;
  let endNodeOffset = 0;

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const nodeLength = node.textContent?.length || 0;

    if (startNode === null && currentOffset + nodeLength > position.startOffset) {
      startNode = node;
      startNodeOffset = position.startOffset - currentOffset;
    }

    if (currentOffset + nodeLength >= position.endOffset) {
      endNode = node;
      endNodeOffset = position.endOffset - currentOffset;
      break;
    }

    currentOffset += nodeLength;
  }

  if (!startNode || !endNode) {
    return applyHighlightByContext(container, position);
  }

  const range = document.createRange();
  try {
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);

    const rangeText = range.toString();
    if (rangeText !== position.text) {
      return applyHighlightByContext(container, position);
    }
  } catch {
    return applyHighlightByContext(container, position);
  }

  return wrapRangeWithHighlight(range, position.id);
}

// Fallback: find text by surrounding context
function applyHighlightByContext(container: Element, position: HighlightPosition): boolean {
  const containerText = container.textContent || '';

  // Build a pattern with context
  const searchPattern = position.beforeContext + position.text + position.afterContext;
  const contextIndex = containerText.indexOf(searchPattern);

  let textStart: number;
  if (contextIndex >= 0) {
    textStart = contextIndex + position.beforeContext.length;
  } else {
    // Try without full context, match with partial context
    const partialPattern = position.beforeContext.slice(-20) + position.text + position.afterContext.slice(0, 20);
    const partialIndex = containerText.indexOf(partialPattern);
    if (partialIndex >= 0) {
      textStart = partialIndex + position.beforeContext.slice(-20).length;
    } else {
      // Last resort: just find the text at the approximate position
      const allMatches: number[] = [];
      let searchStart = 0;
      let foundIndex: number;
      while ((foundIndex = containerText.indexOf(position.text, searchStart)) !== -1) {
        allMatches.push(foundIndex);
        searchStart = foundIndex + 1;
      }

      if (allMatches.length === 0) return false;

      // Find closest match to original offset
      textStart = allMatches.reduce((prev, curr) =>
        Math.abs(curr - position.startOffset) < Math.abs(prev - position.startOffset) ? curr : prev
      );
    }
  }

  // Find text nodes at this position
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let currentOffset = 0;
  let startNode: Text | null = null;
  let startNodeOffset = 0;
  let endNode: Text | null = null;
  let endNodeOffset = 0;

  let textNode: Text | null;
  while ((textNode = walker.nextNode() as Text | null)) {
    const nodeLength = textNode.textContent?.length || 0;

    if (startNode === null && currentOffset + nodeLength > textStart) {
      startNode = textNode;
      startNodeOffset = textStart - currentOffset;
    }

    if (currentOffset + nodeLength >= textStart + position.text.length) {
      endNode = textNode;
      endNodeOffset = textStart + position.text.length - currentOffset;
      break;
    }

    currentOffset += nodeLength;
  }

  if (!startNode || !endNode) return false;

  try {
    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    return wrapRangeWithHighlight(range, position.id);
  } catch {
    return false;
  }
}

// Wrap a range with highlight markup
function wrapRangeWithHighlight(range: Range, highlightId: string): boolean {
  try {
    const mark = document.createElement('mark');
    mark.className = HIGHLIGHT_CLASS;
    mark.dataset.highlightId = highlightId;

    range.surroundContents(mark);
    return true;
  } catch {
    // Handle complex ranges that span multiple elements
    try {
      const fragment = range.extractContents();
      const mark = document.createElement('mark');
      mark.className = HIGHLIGHT_CLASS;
      mark.dataset.highlightId = highlightId;
      mark.appendChild(fragment);
      range.insertNode(mark);
      return true;
    } catch {
      return false;
    }
  }
}

// Highlight selection immediately
function highlightSelection(selection: Selection, highlightId: string): boolean {
  if (!selection.rangeCount || selection.isCollapsed) return false;

  const range = selection.getRangeAt(0);
  return wrapRangeWithHighlight(range, highlightId);
}
