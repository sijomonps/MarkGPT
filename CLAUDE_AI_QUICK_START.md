# MarkGPT - Claude AI Quick Start Guide

## What is MarkGPT?

MarkGPT is a Chrome extension that lets you bookmark important messages in AI chat conversations. With the latest updates, it now has enhanced support for Claude AI.

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the extension folder
5. Visit [claude.ai](https://claude.ai) to start using it

## Quick Start

### Bookmarking on Claude AI

1. **Open a conversation** on Claude.ai
2. **Hover over any message** (yours or Claude's)
3. **Look for a bookmark icon** (flag) that appears on the right
4. **Click the icon** to bookmark the message
5. A confirmation message shows: "Saved: [message preview]"

### Managing Bookmarks

1. **Click the MarkGPT icon** in your Chrome toolbar
2. **View all your bookmarks** in the panel
3. **Click any bookmark** to jump to that message in the chat
4. **Delete a bookmark** by clicking the X button next to it

## Supported Sites

- ✅ **Claude AI** - claude.ai
- ✅ **ChatGPT** - chat.openai.com, chatgpt.com
- ✅ **Google Gemini** - gemini.google.com

## Features

- 🔖 **Save Important Messages** - bookmark messages you want to keep
- 🔍 **Quick Navigation** - jump between bookmarks in the same chat
- 📝 **Custom Labels** - optionally add custom labels to bookmarks
- 💾 **Persistent Storage** - bookmarks are saved in your browser
- 🎨 **Clean UI** - non-intrusive button overlay
- 🔄 **Cross-Chat Support** - navigate between chats using bookmarks

## Claude AI Specific Tips

### For Best Results:

1. **Wait for messages to fully load** before bookmarking
   - Claude's responses take a moment to generate
   - Let streaming finish before bookmarking

2. **Bookmark complete thoughts** 
   - Rather than partial messages
   - Helps with accurate bookmark recovery

3. **Use meaningful labels** (optional)
   - Makes it easier to find bookmarks later
   - Especially useful with long conversations

### What Works Well:

✅ Text-based responses  
✅ Code snippets  
✅ Multi-paragraph explanations  
✅ User questions  
✅ Claude's complete responses

### Known Quirks:

⚠️ Messages with images may not display images in bookmarks  
⚠️ Interactive components don't get bookmarked  
⚠️ Regular bookmark updates aren't automatic  

## Troubleshooting

### Missing Bookmark Button?

1. **Hard refresh** the page: `Ctrl+Shift+R`
2. **Check if enabled**: Click extension icon, see if toggle is ON
3. **Check console**: Press F12, look for errors
4. **Run diagnostic**: Use the CLAUDE_AI_DIAGNOSTIC.js script

### Can't Find Bookmarked Message?

1. **Message text might have changed** - bookmarks rely on text matching
2. **Chat was regenerated** - messages may be in different order
3. **Very long chats** - might need to scroll to load messages
4. **Message was deleted** - bookmarks can't find deleted messages

### Extension Not Responding?

1. Go to `chrome://extensions/`
2. Find MarkGPT
3. Click the toggle to turn OFF
4. Click the toggle to turn ON
5. Go back to Claude.ai

## Keyboard Shortcuts

No keyboard shortcuts currently, but you can:
- Click the bookmark button when hovering over messages
- Click bookmarks in the panel to navigate

## Privacy & Storage

- ✅ All bookmarks stored **locally** on your computer
- ✅ No cloud upload or sync
- ✅ No data sent to external servers
- ✅ No tracking or analytics
- ✅ You own your bookmarks completely

## Settings

Click the MarkGPT icon to access:
- **Toggle** to enable/disable the extension
- **Author credit** showing the extension version
- **Bookmark count** display

For more detailed settings or customizations, check the advanced debugging guide.

## Common Questions

### Q: Can I use this on other AI sites?
**A:** Yes! Currently supports ChatGPT, Claude, and Google Gemini with more coming.

### Q: Will my bookmarks sync across devices?
**A:** Not yet - bookmarks are stored only on the device where you create them.

### Q: Can I export bookmarks?
**A:** Currently no, but you can manually copy text from bookmarks.

### Q: Does this work on mobile?
**A:** No - Chrome extensions only work on desktop/laptop browsers.

### Q: What happens if Claude AI updates?
**A:** The extension should continue working, but if the website layout changes dramatically, an update may be needed.

## Getting Help

If you encounter issues:

1. **Read CLAUDE_AI_DEBUG.md** for common issues
2. **Run the diagnostic script** - copy CLAUDE_AI_DIAGNOSTIC.js into browser console
3. **Check browser console** for error messages
4. **Report with details:**
   - Screenshot of the issue
   - Browser version
   - Extension version
   - Steps to reproduce

## Tips for Heavy Users

- Keep bookmark labels short and descriptive
- Regularly review and remove old bookmarks
- Use bookmarks within the same chat for reliability
- Test bookmarking works before saving important message

## Developer Info

Built with vanilla JavaScript - no external dependencies.

**Version:** 1.2.1+  
**License:** Check LICENSE file  
**Author:** Sijomon P S

## What's New in 1.2.1+

- ✨ **Enhanced Claude AI support** with better message detection
- ✨ **Improved button placement** for Claude's layout
- ✨ **Better message text extraction** for all platforms
- 📖 **New debugging tools** for troubleshooting
- 📖 **Comprehensive documentation** for Claude users

For detailed technical changes, see CLAUDE_AI_UPDATES.md

---

**Happy bookmarking! 🎯**

Questions? Check the debugging guides or run the diagnostic script.
