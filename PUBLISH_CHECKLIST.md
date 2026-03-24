# MarkGPT Chrome Web Store Checklist

## 1) Final Extension Package
- Confirm `manifest.json` name is `MarkGPT`
- Confirm version is updated
- Confirm icons exist and match manifest paths:
  - `icons/icons16.png`
  - `icons/icon48.png`
  - `icons/icon128.png`

## 2) Build ZIP Upload File
From project root, run:

```powershell
Compress-Archive -Path .\manifest.json,.\content.js,.\popup.html,.\popup.js,.\icons,.\PRIVACY_POLICY.md -DestinationPath .\MarkGPT-v1.2.0.zip -Force
```

## 3) Chrome Web Store Developer Dashboard
- Create new item upload with `MarkGPT-v1.2.0.zip`
- Set category and language
- Add store description, screenshots, and promo graphics
- Add support email
- Add privacy policy URL (host the contents of `PRIVACY_POLICY.md` on a public page)

## 4) Data Disclosure Form
- Data handled: user-provided bookmark content stored locally
- Data transfer: no external transfer
- Data sale: no
- Data use: extension functionality only

## 5) Pre-Submit Smoke Test
- Install unpacked extension
- Bookmark in one chat and navigate from popup
- Verify exact scroll behavior
- Verify enable/disable toggle
- Verify export and clear actions
