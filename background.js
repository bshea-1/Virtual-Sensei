/*
 * Virtual Sensei
 * Copyright (c) 2026 Brennan Shea. All rights reserved.
 * Unauthorized use, copying, or distribution is strictly prohibited.
 * See LICENSE file for details.
 */

// background.js

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Strict global disable by default
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ enabled: false });
});

const ALLOWED_ORIGINS = ['impact.codeninjas.com', 'arcade.makecode.com'];

function updateSidePanelState(tabId, url) {
  if (!url) return;
  const isAllowed = ALLOWED_ORIGINS.some(origin => url.includes(origin));
  
  chrome.sidePanel.setOptions({
    tabId: tabId,
    path: isAllowed ? 'panel.html' : undefined,
    enabled: isAllowed
  }).catch(err => console.warn('Side panel toggle warning:', err));
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab.url) {
    updateSidePanelState(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      updateSidePanelState(activeInfo.tabId, tab.url);
    }
  } catch (e) {
    console.warn('Tab read error:', e);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TRIGGER_SENSEI_HELP') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && (activeTab.url.includes('impact.codeninjas.com') || activeTab.url.includes('makecode.com'))) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            world: 'MAIN',
            func: () => {
               // Try to match specific text on buttons that means "Ask Sensei" or "Help"
               const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
               const helpBtn = btns.find(b => {
                 const t = b.innerText ? b.innerText.toLowerCase() : '';
                 return t.includes('ask sensei') || t.includes('sensei help') || t.includes('get help') || t.includes('human help');
               });
               if (helpBtn) helpBtn.click();
            }
          });
        } catch(e) { console.warn('Fail push help btn', e); }
      }
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'TRIGGER_CLOSE_HELP') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && (activeTab.url.includes('impact.codeninjas.com') || activeTab.url.includes('makecode.com'))) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            world: 'MAIN',
            func: () => {
               const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
               const helpBtn = btns.find(b => {
                 const t = b.innerText ? b.innerText.toLowerCase() : '';
                 return t.includes('close help') || t.includes('cancel request') || t.includes('cancel help') || t.includes('close');
               });
               if (helpBtn) helpBtn.click();
            }
          });
        } catch(e) { console.warn('Fail push close help btn', e); }
      }
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'CAPTURE_WORKSPACE') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && (activeTab.url.includes('impact.codeninjas.com') || activeTab.url.includes('arcade.makecode.com'))) {
        try {
          // 1. Capture screen
          const dataUrl = await new Promise((resolve, reject) => {
            chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'jpeg', quality: 50 }, (url) => {
              if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
              else resolve(url);
            });
          });

          // 2. Extract codebase visually or from Monaco AND capture tutorials
          let codeContext = '';
          let tutorialContext = '';
          try {
            const injection = await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              world: 'MAIN',
              func: () => {
                 let code = '';
                 let tutorial = '';

                 // Extract Code
                 try {
                   // Try to get exact code from Monaco editor globals
                   if (window.monaco && window.monaco.editor) {
                      const models = window.monaco.editor.getModels();
                      if (models.length > 0) code = models[0].getValue();
                   }
                 } catch(e) {}
                 
                 if (!code) {
                   // Fallback to reading the rendered DOM lines if Monaco object is blocked
                   const lines = Array.from(document.querySelectorAll('.view-lines .view-line'));
                   if (lines.length > 0) code = lines.map(line => line.textContent).join('\n');
                 }

                 if (!code) {
                   // If no code editor is visible, read the whole page's DOM text
                   code = document.body.innerText || '';
                 }

                 // Extract Tutorial / Hints
                 try {
                   const tutorialElements = document.querySelectorAll('.tutorial-card, .tutorial-instruction, .instructions, .markdown-content, .markedContent, .hint-content, .tutorial-hint, .tutorialhint, .instruction-text, .step-text, .hint');
                   if (tutorialElements.length > 0) {
                      tutorial = Array.from(tutorialElements).map(el => el.textContent.trim()).join('\n\n');
                   }
                 } catch(e) {}

                 return { code, tutorial };
              }
            });
            codeContext = injection[0]?.result?.code || '';
            tutorialContext = injection[0]?.result?.tutorial || '';
          } catch(err) {
             console.warn('Script extraction failed:', err);
          }
          
          sendResponse({ success: true, dataUrl: dataUrl, codeContext: codeContext, tutorialContext: tutorialContext });

        } catch(err) {
            console.error('Capture error:', err.message);
            sendResponse({ success: false, error: err.message });
        }
      } else {
         sendResponse({ success: false, error: 'Cannot capture on this URL. Please navigate to MakeCode Arcade or Code Ninjas IMPACT.' });
      }
    });

    // Return true to indicate we wish to send a response asynchronously
    return true;
  }
});
