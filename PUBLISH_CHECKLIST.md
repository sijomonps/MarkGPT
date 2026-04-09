# MarkGPT Chrome Web Store Checklist

## 1) Final Extension Package
- Confirm `manifest.json` name is `MarkGPT`
- Confirm version is updated
- Confirm permissions are least-privilege (`permissions` should be only `storage`)
- Confirm no unused `tabs` permission is present
- Confirm icons exist and match manifest paths:
  - `icons/icons16.png`
  - `icons/icon48.png`
  - `icons/icon128.png`

## 2) Build ZIP Upload File
From project root, run:

```powershell
./build.ps1
```

Or on Linux/macOS:

```bash
VERSION=$(jq -r '.version' manifest.json) && cp manifest.json build-package/manifest.json && cp content.js build-package/content.js && cp popup.html build-package/popup.html && cp popup.js build-package/popup.js && cp -r icons/* build-package/icons/ && cd build-package && zip -r "../MarkGPT-v${VERSION}.zip" .
```

## 3) Chrome Web Store Developer Dashboard
- Upload `MarkGPT-v<manifest-version>.zip` (the ZIP generated from current manifest version)
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
- Bookmark at least one message in each supported site (ChatGPT, Claude, Gemini)
- Open the in-page bookmark panel and navigate to a saved message
- Verify exact scroll-to-message behavior
- Verify enable/disable toggle
- Delete one bookmark and verify list refresh
