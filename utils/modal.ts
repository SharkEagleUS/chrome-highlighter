// Modal component for adding comments and tags to highlights

const MODAL_ID = 'text-highlighter-modal';
const MODAL_OVERLAY_ID = 'text-highlighter-modal-overlay';

export interface HighlightMetadata {
  comment: string;
  tags: string[];
}

export function injectModalStyles(): void {
  if (document.getElementById('text-highlighter-modal-styles')) return;

  const style = document.createElement('style');
  style.id = 'text-highlighter-modal-styles';
  style.textContent = `
    .${MODAL_OVERLAY_ID} {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    .${MODAL_ID} {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .${MODAL_ID}-header {
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .${MODAL_ID}-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .${MODAL_ID}-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #666;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .${MODAL_ID}-close:hover {
      background-color: #f0f0f0;
    }

    .${MODAL_ID}-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }

    .${MODAL_ID}-text-display {
      background-color: #fff9c4;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
      border-left: 4px solid #ffc107;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      max-height: 150px;
      overflow-y: auto;
    }

    .${MODAL_ID}-form-group {
      margin-bottom: 20px;
    }

    .${MODAL_ID}-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .${MODAL_ID}-textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      min-height: 80px;
      box-sizing: border-box;
    }

    .${MODAL_ID}-textarea:focus,
    .${MODAL_ID}-input:focus {
      outline: none;
      border-color: #ffc107;
      box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.1);
    }

    .${MODAL_ID}-input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
    }

    .${MODAL_ID}-tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
      min-height: 32px;
    }

    .${MODAL_ID}-tag {
      display: inline-flex;
      align-items: center;
      background-color: #e3f2fd;
      color: #1976d2;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 13px;
      gap: 6px;
    }

    .${MODAL_ID}-tag-remove {
      background: none;
      border: none;
      color: #1976d2;
      cursor: pointer;
      padding: 0;
      font-size: 16px;
      line-height: 1;
      font-weight: bold;
    }

    .${MODAL_ID}-tag-remove:hover {
      color: #0d47a1;
    }

    .${MODAL_ID}-hint {
      font-size: 12px;
      color: #666;
      margin-top: 6px;
    }

    .${MODAL_ID}-footer {
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .${MODAL_ID}-button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .${MODAL_ID}-button-cancel {
      background-color: #f5f5f5;
      color: #333;
    }

    .${MODAL_ID}-button-cancel:hover {
      background-color: #e0e0e0;
    }

    .${MODAL_ID}-button-save {
      background-color: #ffc107;
      color: #000;
    }

    .${MODAL_ID}-button-save:hover {
      background-color: #ffb300;
    }

    .${MODAL_ID}-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(style);
}

export function showHighlightModal(
  selectedText: string,
  onSave: (metadata: HighlightMetadata) => void,
  onCancel: () => void
): void {
  // Inject styles if not already present
  injectModalStyles();

  // Remove any existing modal
  removeModal();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = MODAL_OVERLAY_ID;
  overlay.id = MODAL_OVERLAY_ID;

  // Create modal
  const modal = document.createElement('div');
  modal.className = MODAL_ID;
  modal.id = MODAL_ID;

  // Create modal HTML
  modal.innerHTML = `
    <div class="${MODAL_ID}-header">
      <h3 class="${MODAL_ID}-title">Save Highlight</h3>
      <button class="${MODAL_ID}-close" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="${MODAL_ID}-body">
      <div class="${MODAL_ID}-text-display">${escapeHtml(selectedText)}</div>

      <div class="${MODAL_ID}-form-group">
        <label class="${MODAL_ID}-label" for="highlight-comment">Comment (optional)</label>
        <textarea
          id="highlight-comment"
          class="${MODAL_ID}-textarea"
          placeholder="Add your thoughts about this highlight..."
        ></textarea>
      </div>

      <div class="${MODAL_ID}-form-group">
        <label class="${MODAL_ID}-label" for="highlight-tags">Tags (optional)</label>
        <input
          id="highlight-tags"
          class="${MODAL_ID}-input"
          type="text"
          placeholder="Press Enter to add tags"
        />
        <div class="${MODAL_ID}-hint">Press Enter after each tag</div>
        <div id="tags-container" class="${MODAL_ID}-tags-container"></div>
      </div>
    </div>
    <div class="${MODAL_ID}-footer">
      <button class="${MODAL_ID}-button ${MODAL_ID}-button-cancel" type="button">Cancel</button>
      <button class="${MODAL_ID}-button ${MODAL_ID}-button-save" type="button">Save Highlight</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // State
  const tags: string[] = [];

  // Get elements
  const closeBtn = modal.querySelector(`.${MODAL_ID}-close`) as HTMLButtonElement;
  const cancelBtn = modal.querySelector(`.${MODAL_ID}-button-cancel`) as HTMLButtonElement;
  const saveBtn = modal.querySelector(`.${MODAL_ID}-button-save`) as HTMLButtonElement;
  const commentTextarea = modal.querySelector('#highlight-comment') as HTMLTextAreaElement;
  const tagsInput = modal.querySelector('#highlight-tags') as HTMLInputElement;
  const tagsContainer = modal.querySelector('#tags-container') as HTMLDivElement;

  // Helper functions
  function renderTags(): void {
    tagsContainer.innerHTML = tags
      .map(
        (tag, index) => `
        <span class="${MODAL_ID}-tag">
          ${escapeHtml(tag)}
          <button class="${MODAL_ID}-tag-remove" data-index="${index}" type="button">&times;</button>
        </span>
      `
      )
      .join('');

    // Add event listeners to remove buttons
    tagsContainer.querySelectorAll(`.${MODAL_ID}-tag-remove`).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index || '0', 10);
        tags.splice(index, 1);
        renderTags();
      });
    });
  }

  function addTag(tag: string): void {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      tags.push(trimmedTag);
      renderTags();
    }
    tagsInput.value = '';
  }

  function handleSave(): void {
    const comment = commentTextarea.value.trim();
    onSave({ comment, tags });
    removeModal();
  }

  function handleCancel(): void {
    onCancel();
    removeModal();
  }

  // Event listeners
  closeBtn.addEventListener('click', handleCancel);
  cancelBtn.addEventListener('click', handleCancel);
  saveBtn.addEventListener('click', handleSave);

  // Tags input handling
  tagsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagsInput.value);
    }
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      handleCancel();
    }
  });

  // Close on Escape key
  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);

  // Focus comment textarea
  setTimeout(() => commentTextarea.focus(), 100);
}

export function removeModal(): void {
  const overlay = document.getElementById(MODAL_OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
