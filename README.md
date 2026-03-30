# Virtual Sensei

Virtual Sensei is a Chrome Extension built for **Code Ninjas IMPACT** and **MakeCode Arcade**. It acts as an AI-powered Socratic tutor, helping kids learn to code without giving away the direct answers. The Sensei guides students with clues, analyzes their screen and code, and parses MakeCode blocks into formatted UI elements.

## Features

- **Side Panel Integration:** Opens conveniently as a Chrome Side Panel seamlessly when navigating to an allowed domain (e.g. `impact.codeninjas.com`).
- **Context-Aware Assistance:** Dynamically captures the active screen, code in the Monaco Editor, and tutorial instructions to provide highly relevant hints.
- **Socratic Method:** Never provides the raw answer but questions and guides the student to the correct solution.
- **MakeCode Block Recognition:** Can format and display Code Block UI elements in chat using tags (E.g. `[[Sprites: mySprite]]`).
- **Powered by Google Gemini:** Uses Gemini Flash/Lite models for fast and intelligent multimodal API calls.

## How It Works

The extension injects a service worker (`background.js`) to monitor when a user visits `impact.codeninjas.com`. When active, it enables the Chrome Side Panel. Once a user asks a question, the extension captures a screenshot of the tab, extracts the current codebase from the Monaco editor or DOM, and pulls any visible tutorial hints. It packages this context alongside the student's question and sends it to the Gemini API, returning advice formatted for MakeCode students.

## Installation & Setup

### 1. Configure Your API Key

Virtual Sensei requires a Google Gemini API key to function. 
1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open the `config.js` file in the extension directory.
3. Replace `'API_KEY_HERE'` with your Gemini API key:
   ```javascript
   export const CONFIG = {
     GEMINI_API_KEY: 'your-api-key-here',
     FALLBACK_KEYS: [] // Optional fallbacks if needed
   };
   ```

### 2. Add as a Chrome Extension

Since this extension is loaded locally, you need to enable Developer Mode in Chrome:

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in your address bar.
3. In the top right corner, toggle **Developer mode** to **ON**.
4. Click the **Load unpacked** button in the top left.
5. Select the `codenextension` folder (the directory containing this `manifest.json` file).
6. The Virtual Sensei extension should now appear in your list of extensions!

### 3. Usage

1. Navigate to `impact.codeninjas.com`.
2. The Virtual Sensei side panel should become available. Click the extension icon to open the panel.
3. Type your coding question and press Enter. The Socratic Sensei will read your screen and codebase to provide a helpful hint!

## License

**© 2026 Brennan Shea. All rights reserved.** Original concept by **James Blasdel**.

Small-scale, personal, non-commercial use is permitted (e.g., individual users or single classroom settings). Large-scale deployment, commercial use, or acquisition by any entity requires a separate written agreement with the owner. See the [LICENSE](LICENSE) file for full terms.
