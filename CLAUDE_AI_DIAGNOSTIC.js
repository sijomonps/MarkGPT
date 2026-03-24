// MarkGPT Claude AI Diagnostic Tool
// Copy and paste this entire script into the browser console at claude.ai to get diagnostics

(function claudeaiDiagnostics() {
  const log = console.log;
  
  console.clear();
  console.log('%c=== MarkGPT Claude AI Diagnostics ===', 'color: #00a8ff; font-size: 14px; font-weight: bold;');
  
  // 1. Check if on Claude AI
  console.log('\n📍 Current Site:');
  log(`  Hostname: ${location.hostname}`);
  log(`  Is Claude AI: ${location.hostname === 'claude.ai' ? '✅ Yes' : '❌ No'}`);
  
  // 2. Check if extension is loaded
  console.log('\n🔧 Extension Status:');
  const extLoaded = window.__bkmrk_loaded === true;
  log(`  Extension loaded: ${extLoaded ? '✅ Yes' : '❌ No'}`);
  
  // 3. Message Detection
  console.log('\n📝 Message Detection:');
  
  const selectors = [
    'div.font-claude-message',
    '[data-testid="user-message"]',
    '[data-testid="assistant-message"]',
    '[data-message-author-role]',
    '[data-testid="message-content"]',
    'article',
    '[role="article"]',
    'div[class*="Message"]',
    '[data-testid*="message"]',
    '[data-testid*="Message"]'
  ];
  
  let totalFound = 0;
  selectors.forEach(selector => {
    try {
      const count = document.querySelectorAll(selector).length;
      if (count > 0) {
        log(`  ✅ ${selector}: ${count} found`);
        totalFound += count;
      }
    } catch (e) {
      log(`  ⚠️ ${selector}: Invalid selector`);
    }
  });
  
  log(`\n  Total unique message elements: ${totalFound}`);
  
  // 4. Inline buttons check
  console.log('\n🎯 Inline Buttons:');
  const buttons = document.querySelectorAll('.bk-inline-btn');
  log(`  Bookmark buttons found: ${buttons.length}`);
  
  const rows = document.querySelectorAll('.bk-inline-row');
  log(`  Button rows found: ${rows.length}`);
  
  // 5. Panel check
  console.log('\n📋 Extension Panel:');
  const panel = document.getElementById('bk-p');
  log(`  Panel exists: ${panel ? '✅ Yes' : '❌ No'}`);
  
  if (panel) {
    const toggler = panel.querySelector('#bk-tog');
    const list = panel.querySelector('#bk-list');
    log(`  Panel visible: ${panel.style.display !== 'none' ? '✅ Yes' : '❌ No (hidden)'}`);
    
    const bookmarkCount = panel.querySelector('#bk-tog-n');
    if (bookmarkCount) {
      log(`  Saved bookmarks: ${bookmarkCount.textContent}`);
    }
  }
  
  // 6. Test message extraction
  console.log('\n🔍 Message Content Analysis:');
  const messageElements = Array.from(document.querySelectorAll('div.font-claude-message, [data-testid="user-message"], [data-testid="assistant-message"]')).slice(0, 3);
  
  if (messageElements.length > 0) {
    messageElements.forEach((elem, idx) => {
      const text = (elem.textContent || '').substring(0, 50).replace(/\n/g, ' ');
      log(`  Message ${idx + 1}: "${text}..."`);
    });
  } else {
    log(`  ⚠️ No messages found in DOM`);
  }
  
  // 7. Storage check
  console.log('\n💾 Browser Storage:');
  chrome.storage.local.get(['extensionEnabled', 'bookmarks'], (res) => {
    log(`  Extension enabled: ${res.extensionEnabled !== false ? '✅ Yes' : '❌ No'}`);
    log(`  Bookmarks stored: ${(res.bookmarks || []).length}`);
  });
  
  // 8. CSS check
  console.log('\n🎨 CSS Injection:');
  const css = document.getElementById('bk-css');
  log(`  CSS injected: ${css ? '✅ Yes' : '❌ No'}`);
  
  // 9. Troubleshooting tips
  console.log('\n💡 Troubleshooting Steps:');
  console.log('  1. Hard refresh with Ctrl+Shift+R');
  console.log('  2. Check if popup shows extension is enabled');
  console.log('  3. Open DevTools (F12) and check for errors');
  console.log('  4. Look for message elements with right-click → Inspect');
  console.log('  5. Run document.querySelectorAll("article").length to verify DOM');
  
  // 10. Manual test
  console.log('\n🧪 Manual Tests:');
  
  // Test 1: Try to find any message-like element
  const possibleMessages = document.querySelectorAll('article, [role="article"], div[class*="Message"]');
  if (possibleMessages.length > 0) {
    log(`  ✅ Found ${possibleMessages.length} potential message containers`);
  } else {
    log(`  ❌ No article or message containers found`);
  }
  
  // Test 2: Check for hover events
  const testBtn = document.querySelector('.bk-inline-btn');
  if (testBtn) {
    log(`  ✅ Inline button exists and can be tested`);
  }
  
  console.log('\n%c=== End of Diagnostics ===', 'color: #00a8ff; font-size: 12px;');
  console.log('If you found issues, please report them with this output.\n');
  
})();
