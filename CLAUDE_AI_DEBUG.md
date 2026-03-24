# Claude AI Debugging Guide for MarkGPT

## Overview
This document explains how to troubleshoot Claude AI compatibility issues with the MarkGPT extension.

## What to Check

### 1. **Bookmark Button Not Appearing**
If you don't see the bookmark button when hovering over messages in Claude:

#### Browser Console Check:
1. Open Claude.ai
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Type: `document.querySelectorAll('.bk-inline-row').length`
5. If it returns `0`, the extension isn't detecting messages

#### DOM Structure Check:
1. Right-click on a Claude message
2. Select "Inspect" to open the DOM inspector
3. Look for elements with these classes/attributes:
   - `data-testid="user-message"` or `data-testid="assistant-message"`
   - `class` containing "message" or "Message"
   - `role="article"`

### 2. **Messages Not Detecting Properly**

#### Check if messages are found:
```javascript
// In browser console:
document.querySelectorAll('div.font-claude-message, [data-testid="user-message"], [data-testid="assistant-message"], article, [role="article"]').length
```

If this returns more than 0, messages are being detected.

#### Get detailed message info:
```javascript
// Copy this into the console to see what elements are found:
const messages = Array.from(document.querySelectorAll('div.font-claude-message, [data-testid="user-message"], [data-testid="assistant-message"], article, [role="article"]'));
messages.forEach((m, i) => console.log(i, m.tagName, m.className, m.getAttribute('data-testid'), m.textContent?.substring(0, 50)));
```

### 3. **Current Supported Selectors for Claude**

The extension now detects messages using these selectors:
- `div.font-claude-message` - Claude's message container class
- `[data-testid="user-message"]` - User message elements
- `[data-testid="assistant-message"]` - Assistant message elements
- `[data-message-author-role]` - Message element with author role
- `[data-testid="message-content"]` - Message content wrapper
- `article` - Article elements (semantic HTML)
- `[role="article"]` - Elements with article role
- `div[class*="Message"]` - Any div with "Message" in class name
- `[data-testid*="message"]` - Any element with "message" in data-testid

## Known Issues and Solutions

### Issue: Buttons appear but don't work
**Solution:**
1. Make sure you're on claude.ai (not another domain)
2. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. Check if extension is enabled in the popup
4. Disable other extensions that might interfere

### Issue: Messages are found but buttons don't appear
**Solution:**
1. This might be a layout/CSS issue
2. The buttons might be hidden under other elements
3. Try hovering at the end of the message text
4. Check if there's a tooltip appearing instead

### Issue: Bookmarks work but can't jump back
**Solution:**
1. Messages must have changed significantly
2. The extension uses text content for matching
3. If you edit the original message, it won't find it
4. Bookmarks include a copy of the original text for reference

## How to Report Issues

When reporting a Claude AI issue, include:

1. **Your browser version**: Settings > About
2. **Extension version**: Check the popup or chrome://extensions
3. **Screenshot** of:
   - The message you're trying to bookmark
   - The browser console output
4. **Console messages**: Check for any errors in the developer console
5. **DOM details**: The element class names and data attributes

## Extension Implementation Details

### How Messages are Identified:
1. Extension watches for DOM changes
2. When a new element appears, it checks if it matches known message selectors
3. If it matches, a bookmark button is added

### How Bookmarks are Saved:
1. The message text is extracted
2. First 300 chars are saved as snippet
3. A signature is created based on:
   - Text start (first 140 normalized chars)
   - Text end (last 140 normalized chars)
   - Text length
4. Message ID (if available) is also saved

### How Bookmarks are Restored:
1. First tries to find by message ID
2. Falls back to signature matching
3. Finally tries basic text search
4. Sorted by confidence score

## Manual Testing Steps

To manually verify the extension works:

1. Open Claude.ai
2. Have a conversation or open an existing chat
3. Look for bookmark buttons (small flag icons) when hovering over messages
4. Click a button to bookmark
5. Open the extension popup
6. You should see your bookmark listed
7. Click the bookmark to navigate to the message

## Firefox vs Chrome Differences

The extension is designed for Chrome/Chromium browsers. If using Firefox or Opera, ensure:
1. The manifest version is compatible
2. Host permissions are set correctly
3. Content scripts are injected properly

## Claude AI DOM Changes

Claude AI's DOM structure may change between UI updates. If the extension stops working:

1. Check this debugging guide for current selectors
2. Open an issue on GitHub with:
   - Screenshot of the page
   - Output from the console check above
   - Your browser and extension versions

3. Temporary workaround: Use text search directly in your Claude conversation

## Contributing Fixes

If you find that the extension doesn't work with Claude AI:

1. Document the exact selectors that work in your version
2. Check the message structure with the inspector
3. Report these findings
4. Help update this guide for others

---

**Last Updated**: March 2026
**Tested on**: Claude.ai (web)
