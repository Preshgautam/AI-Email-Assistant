console.log("Email Writer Extension - Content Script Loaded");

// Creates the AI‑Reply button
function createAIButton() {
  const btn = document.createElement('div');
  btn.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3 ai-reply-button';
  btn.style.marginRight = '8px';
  btn.innerText = 'AI‑Reply';
  btn.setAttribute('role', 'button');
  btn.setAttribute('data-tooltip', 'Generate AI Reply');
  return btn;
}

// Extracts the recipient's name from compose header
function getRecipientName() {
  const span = document.querySelector('span[email]');
  return span ? (span.textContent || span.getAttribute('email')).trim() : '';
}

// Captures original email content
function getEmailContent() {
  const selectors = ['.h7', '.a3s.aiL', '.gmail_quote', '[role="presentation"]'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el.innerText.trim();
  }
  return '';
}

// Locates the compose toolbar
function findComposedToolbar() {
  const selectors = ['.btC', '.aDh', '[role="toolbar"]', '.gU.Up'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

// Injects the AI‑Reply button into the toolbar
function injectButton() {
  // Remove old button if present
  document.querySelectorAll('.ai-reply-button').forEach(b => b.remove());

  const toolbar = findComposedToolbar();
  if (!toolbar) {
    console.log("Toolbar not found");
    return;
  }

  console.log("Toolbar found, injecting AI button");
  const button = createAIButton();

  button.addEventListener('click', async () => {
    button.innerText = 'Generating…';
    button.disabled = true;
    try {
      const recipientName = getRecipientName();
      const emailBody = getEmailContent();

      const res = await fetch('http://localhost:8080/api/email/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientName, emailContent: emailBody, tone: 'professional' })
      });

      if (!res.ok) throw new Error('API request failed');

      const generated = await res.text();
      const compose = document.querySelector('[role="textbox"][g_editable="true"]');
      if (compose) {
        compose.focus();
        document.execCommand('insertText', false,
          (recipientName ? `Dear ${recipientName},\n\n` : '') + generated);
      } else {
        console.error('Compose box not found');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate reply');
    } finally {
      button.innerText = 'AI‑Reply';
      button.disabled = false;
    }
  })

  toolbar.insertBefore(button, toolbar.firstChild);

  // Prevent Gmail from hiding the toolbar parent
  const parent = toolbar.parentElement;
  if (parent && getComputedStyle(parent).display === 'none') {
    parent.style.display = 'flex';
  }
}

// Observe DOM mutations for new compose windows
const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    const added = Array.from(m.addedNodes).filter(n => n.nodeType === Node.ELEMENT_NODE);
    if (added.some(n =>
      (n.matches?.('.aDh, .btC, [role="dialog"]') ||
       n.querySelector?.('.aDh, .btC, [role="dialog"]'))
    )) {
      console.log("Compose Window Detected");
      setTimeout(injectButton, 1000);
      break;
    }
  }
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });
