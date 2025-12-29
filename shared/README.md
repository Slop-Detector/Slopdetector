# StopTheSlop - Configuration Guide

## Single Source of Truth

All default settings and the system prompt are now centralized in **`shared/config.js`**. This is the **only** file you need to edit to update:

- Default system prompt for AI detection
- Default settings (threshold, auto-scan, model provider, etc.)
- Any other configuration values

## How It Works

### File Structure

```
StopTheSlop/
├── shared/
│   └── config.js          ← SINGLE SOURCE OF TRUTH
├── background/
│   └── background.js      ← Imports from shared/config.js
├── content/
│   └── core.js            ← Uses shared/config.js (loaded via manifest)
├── popup/
│   ├── popup.html         ← Loads shared/config.js
│   └── popup.js           ← Uses shared/config.js
└── manifest.json          ← Includes shared/config.js in all contexts
```

### Configuration File (`shared/config.js`)

This file exports two main objects:

1. **`DEFAULT_SYSTEM_PROMPT`** - The AI detection prompt sent to the LLM
2. **`DEFAULT_SETTINGS`** - All default extension settings

### Usage in Different Contexts

#### Background Service Worker (background.js)
```javascript
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SETTINGS } from '../shared/config.js';

this.defaultSystemPrompt = DEFAULT_SYSTEM_PROMPT;
this.settings = { ...DEFAULT_SETTINGS };
```

#### Content Scripts (core.js)
```javascript
// Loaded automatically via manifest.json
this.settings = { ...window.StopTheSlopConfig.DEFAULT_SETTINGS };
```

#### Popup (popup.js)
```javascript
// Loaded via <script> tag in popup.html
this.defaultSystemPrompt = window.StopTheSlopConfig.DEFAULT_SYSTEM_PROMPT;
this.settings = { ...window.StopTheSlopConfig.DEFAULT_SETTINGS };
```

## Updating the System Prompt

To change the AI detection prompt, edit **`shared/config.js`**:

```javascript
const DEFAULT_SYSTEM_PROMPT = `Your new prompt here...`;
```

That's it! The change will automatically apply to:
- Background service worker (LM Studio, OpenAI, Claude API calls)
- Popup UI (when resetting to defaults)
- All content scripts

## Updating Default Settings

To change default settings, edit the `DEFAULT_SETTINGS` object in **`shared/config.js`**:

```javascript
const DEFAULT_SETTINGS = {
  enabled: true,
  modelProvider: 'lmstudio',
  threshold: 0.7,
  autoScan: false,
  // ... etc
};
```

## Benefits

✅ **No Duplication** - Settings defined once, used everywhere  
✅ **Easy Maintenance** - Update one file instead of three  
✅ **Consistency** - All components use identical defaults  
✅ **Type Safety** - Single definition reduces typos and errors  

## Migration Notes

Previously, default settings were duplicated in:
- ❌ `background/background.js` (removed)
- ❌ `popup/popup.js` (removed)
- ❌ `content/core.js` (removed)

Now they're all in:
- ✅ `shared/config.js` (single source of truth)
