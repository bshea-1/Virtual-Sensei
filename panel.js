/*
 * Virtual Sensei
 * Copyright (c) 2026 Brennan Shea. All rights reserved.
 * Unauthorized use, copying, or distribution is strictly prohibited.
 * See LICENSE file for details.
 */

// panel.js
import { CONFIG } from './config.js';
import { SYSTEM_PROMPT, MODEL_ACK } from './prompts.js';
import { MAKECODE_BLOCK_REFERENCE } from './blocks.js';

let currentCaptureDataUrl = null;
let conversationHistory = [];
let displayMessages = [];
let isBoostMode = false;
let isGenerating = false;

const API_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite-preview',
  'gemini-flash-latest'
];

// DOM Elements
const chatContainer = document.getElementById('chat-container');
const promptInput = document.getElementById('prompt-input');
const sendBtn = document.getElementById('send-btn');
const refreshBtn = document.getElementById('refresh-btn');
const resolveBtn = document.getElementById('resolve-btn');
const quickStarters = document.getElementById('quick-starters');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Restore saved session
  await restoreSession();

  // Refresh Chat History custom modal
  const modal = document.getElementById('clear-modal');
  const btnCancel = document.getElementById('modal-cancel-btn');
  const btnConfirm = document.getElementById('modal-confirm-btn');

  if (refreshBtn && modal) {
    refreshBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });

    btnCancel.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    btnConfirm.addEventListener('click', () => {
      modal.classList.add('hidden');
      conversationHistory = [];
      displayMessages = [];
      isBoostMode = false;
      chatContainer.innerHTML = '';

      document.body.classList.remove('boost-mode');
      if (resolveBtn) resolveBtn.classList.add('hidden');

      const inputControls = document.getElementById('input-controls');
      const boostPrompt = document.getElementById('boost-prompt');
      if (inputControls) inputControls.style.display = 'flex';
      if (boostPrompt) boostPrompt.classList.add('hidden');

      if (promptInput) {
        promptInput.disabled = false;
        promptInput.placeholder = "Ask the Virtual Sensei a question...";
        setTimeout(() => promptInput.focus(), 10);
      }

      const initialMsg = `<p>Hey Ninja! 🥷 I'm your Virtual Sensei. Tell me what you're working on, and we'll figure it out together!</p>`;
      addMessageDirect(initialMsg, 'sensei', false);
      saveSession();
      updateQuickStarters();
    });
  }

  if (resolveBtn) {
    resolveBtn.addEventListener('click', () => {
      isBoostMode = false;
      document.body.classList.remove('boost-mode');
      resolveBtn.classList.add('hidden');

      const inputControls = document.getElementById('input-controls');
      const boostPrompt = document.getElementById('boost-prompt');
      if (inputControls) inputControls.style.display = 'flex';
      if (boostPrompt) boostPrompt.classList.add('hidden');

      if (promptInput) {
        promptInput.disabled = false;
        promptInput.placeholder = "Ask the Virtual Sensei a question...";
        setTimeout(() => promptInput.focus(), 10);
      }

      chrome.runtime.sendMessage({ action: 'TRIGGER_CLOSE_HELP' }).catch(() => { });

      const checkMsg = `<p>Sensei check complete! ✨ What's next on our quest?</p>`;
      addMessageDirect(checkMsg, 'sensei', false);
      saveSession();
    });
  }

  // Set up quick starters
  if (quickStarters) {
    const chips = quickStarters.querySelectorAll('.starter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        promptInput.value = chip.textContent.trim();
        handleSendPrompt();
      });
    });
  }

  // Send Prompt (Enter key without shift)
  promptInput.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return; // Handle IME seamlessly
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && !sendBtn.disabled) {
        handleSendPrompt();
      }
    }
  });

  // Auto-resize textarea
  promptInput.addEventListener('input', function () {
    this.style.height = 'auto'; // Reset height first
    const computedHeight = Math.min(this.scrollHeight, 120);
    this.style.height = computedHeight + 'px';
  });

  // Send Prompt (Button click)
  sendBtn.addEventListener('click', () => {
    if (!isGenerating && !sendBtn.disabled) {
      handleSendPrompt();
    }
  });

  if (!isBoostMode) {
    setTimeout(() => { if (promptInput) promptInput.focus(); }, 10);
  }
  updateQuickStarters();
});

function updateQuickStarters() {
  if (!quickStarters) return;
  // If there are no user messages, show suggestions
  if (conversationHistory.length === 0) {
    quickStarters.classList.remove('hidden');
  } else {
    quickStarters.classList.add('hidden');
  }
}

async function saveSession() {
  try {
    await chrome.storage.local.set({
      vs_conversationHistory: conversationHistory,
      vs_displayMessages: displayMessages,
      vs_boostMode: isBoostMode
    });
  } catch (e) {
    console.warn('Session save failed:', e);
  }
}

async function restoreSession() {
  try {
    const data = await chrome.storage.local.get(['vs_conversationHistory', 'vs_displayMessages', 'vs_boostMode']);

    if (data.vs_boostMode) {
      isBoostMode = true;
      document.body.classList.add('boost-mode');
      if (resolveBtn) resolveBtn.classList.remove('hidden');

      const inputControls = document.getElementById('input-controls');
      const boostPrompt = document.getElementById('boost-prompt');
      if (inputControls) inputControls.style.display = 'none';
      if (boostPrompt) boostPrompt.classList.remove('hidden');
    }

    if (data.vs_displayMessages && data.vs_displayMessages.length > 0) {
      conversationHistory = data.vs_conversationHistory || [];
      const savedMessages = data.vs_displayMessages || [];

      chatContainer.innerHTML = '';
      displayMessages = []; // Reset first

      for (const msg of savedMessages) {
        addMessageDirect(msg.html, msg.senderClass, msg.isError || false);
      }
    }
  } catch (e) {
    console.warn('Session restore failed:', e);
  }
}

async function captureTabSilently() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'CAPTURE_WORKSPACE' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        resolve(null);
      } else {
        resolve({ dataUrl: response.dataUrl, codeContext: response.codeContext, tutorialContext: response.tutorialContext });
      }
    });
  });
}

async function handleSendPrompt() {
  if (isGenerating || sendBtn.disabled) return;
  const prompt = promptInput.value.trim();

  if (!prompt) return;

  if (!CONFIG.GEMINI_API_KEY) {
    addMessageToChat('Please configure your Gemini API Key in config.js.', 'sensei', true);
    return;
  }

  isGenerating = true;

  // Remove any previous error message from screen so it's clean
  const errorElements = chatContainer.querySelectorAll('.error-msg');
  errorElements.forEach(el => el.remove());
  displayMessages = displayMessages.filter(msg => !msg.isError);
  saveSession();

  // Add user message to UI
  let displayHTML = `<p>${escapeHtml(prompt).replace(/\n/g, '<br>')}</p>`;
  const studentMsgResult = addMessageDirect(displayHTML, 'student', false);

  const originalPrompt = promptInput.value;
  promptInput.value = '';
  promptInput.dispatchEvent(new Event('input', { bubbles: true }));
  sendBtn.disabled = true;
  updateQuickStarters();

  // Add a loading indicator
  const loadingElement = addLoadingIndicator();

  try {
    // Secretly capture the tab image & context
    const captureResult = await captureTabSilently();

    let responseText = await callGeminiApi(
      prompt,
      captureResult?.dataUrl,
      captureResult?.codeContext,
      captureResult?.tutorialContext
    );

    let requiredBoost = false;
    if (/\[\[?\s*NINJA_BOOST\s*\]?\]/i.test(responseText)) {
      requiredBoost = true;
      responseText = responseText.replace(/\[\[?\s*NINJA_BOOST\s*\]?\]/gi, '').trim();
    }

    removeLoadingIndicator(loadingElement);
    addMessageToChat(responseText, 'sensei');

    if (requiredBoost) {
      isBoostMode = true;
      document.body.classList.add('boost-mode');
      if (resolveBtn) resolveBtn.classList.remove('hidden');

      const inputControls = document.getElementById('input-controls');
      const boostPrompt = document.getElementById('boost-prompt');
      if (inputControls) inputControls.style.display = 'none';
      if (boostPrompt) boostPrompt.classList.remove('hidden');

      chrome.runtime.sendMessage({ action: 'TRIGGER_SENSEI_HELP' }).catch(() => { });
      saveSession();
    }

  } catch (error) {
    removeLoadingIndicator(loadingElement);
    
    // Remove the visually stuck student message
    if (studentMsgResult && studentMsgResult.element && studentMsgResult.element.parentNode) {
       studentMsgResult.element.parentNode.removeChild(studentMsgResult.element);
    }
    const idx = displayMessages.indexOf(studentMsgResult.msgObj);
    if (idx !== -1) {
       displayMessages.splice(idx, 1);
       saveSession();
    }

    addMessageToChat(`Error: ${error.message}. Please try again!`, 'sensei', true);
    promptInput.value = originalPrompt;
    promptInput.dispatchEvent(new Event('input', { bubbles: true }));
    updateQuickStarters();
  } finally {
    isGenerating = false;
    if (!isBoostMode) {
      sendBtn.disabled = false;
      setTimeout(() => { if (promptInput) promptInput.focus(); }, 10);
    }
  }
}

function addMessageDirect(htmlContent, senderClass, isError = false) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', senderClass);
  if (isError) msgDiv.classList.add('error-msg');
  msgDiv.innerHTML = htmlContent;
  chatContainer.appendChild(msgDiv);
  scrollToBottom();

  // Track for persistence
  const msgObj = { html: htmlContent, senderClass, isError };
  displayMessages.push(msgObj);
  saveSession();

  return { element: msgDiv, msgObj: msgObj };
}

function addMessageToChat(text, senderClass, isError = false) {
  // Convert basic markdown to HTML for Sensei's responses
  let formattedText = escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  if (!formattedText.startsWith('<p>')) {
    formattedText = `<p>${formattedText}</p>`;
  }

  // Parser for virtual UI elements
  formattedText = formattedText.replace(/\[\[\s*(?:([^:\]]+)\s*:\s*)?([^\]]+?)\s*\]\]/gi, (match, category, textContent) => {
    const catLower = (category || textContent).trim().toLowerCase();

    // Default to the text itself if category is 'Action' or unrecognized, to not break existing matches
    let cssClass = 'mc-default';
    if (catLower.includes('sprite')) cssClass = 'mc-sprites';
    else if (catLower.includes('controller')) cssClass = 'mc-controller';
    else if (catLower.includes('game')) cssClass = 'mc-game';
    else if (catLower.includes('music')) cssClass = 'mc-music';
    else if (catLower.includes('logic')) cssClass = 'mc-logic';
    else if (catLower.includes('variable')) cssClass = 'mc-variables';
    else if (catLower.includes('math')) cssClass = 'mc-math';
    else if (catLower.includes('loop')) cssClass = 'mc-loops';
    else if (catLower.includes('function')) cssClass = 'mc-functions';
    else if (catLower.includes('array')) cssClass = 'mc-arrays';
    else if (catLower.includes('text')) cssClass = 'mc-text';
    else if (catLower.includes('scene')) cssClass = 'mc-scene';
    else if (catLower.includes('info')) cssClass = 'mc-info';
    else if (catLower.includes('animation') || catLower.includes('anim')) cssClass = 'mc-animation';
    else if (catLower.includes('image')) cssClass = 'mc-images';

    return `<span class="mc-block ${cssClass}">${textContent.trim()}</span>`;
  });



  if (senderClass === 'sensei' && !isError) {
    animateTyping(formattedText, senderClass);
  } else {
    addMessageDirect(formattedText, senderClass, isError);
  }
}

function animateTyping(htmlContent, senderClass) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', senderClass);
  chatContainer.appendChild(msgDiv);

  // Track for persistence
  displayMessages.push({ html: htmlContent, senderClass, isError: false });
  saveSession();

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  function walkAndType(sourceNode, targetNode, callback) {
    if (sourceNode.nodeType === Node.TEXT_NODE) {
      const text = sourceNode.textContent;
      let i = 0;
      const textNode = document.createTextNode('');
      targetNode.appendChild(textNode);

      function typeChunk() {
        if (i >= text.length) {
          callback();
          return;
        }
        // Add 4 characters per frame to make it fast and buttery smooth
        textNode.textContent += text.substring(i, i + 4);
        i += 4;
        scrollToBottom();
        requestAnimationFrame(typeChunk);
      }
      requestAnimationFrame(typeChunk);

    } else if (sourceNode.nodeType === Node.ELEMENT_NODE) {
      const clone = sourceNode.cloneNode(false);
      targetNode.appendChild(clone);

      const children = Array.from(sourceNode.childNodes);
      let childIndex = 0;

      function processNext() {
        if (childIndex < children.length) {
          walkAndType(children[childIndex], clone, () => {
            childIndex++;
            processNext();
          });
        } else {
          callback();
        }
      }
      processNext();
    } else {
      callback();
    }
  }

  const roots = Array.from(tempDiv.childNodes);
  let rootIndex = 0;

  function processRoot() {
    if (rootIndex < roots.length) {
      walkAndType(roots[rootIndex], msgDiv, () => {
        rootIndex++;
        processRoot();
      });
    }
  }
  processRoot();
}

function addLoadingIndicator() {
  const loadingDiv = document.createElement('div');
  loadingDiv.classList.add('typing-bubble');
  loadingDiv.id = 'loading-indicator-div';
  loadingDiv.innerHTML = `💬 <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
  chatContainer.appendChild(loadingDiv);
  scrollToBottom();
  return loadingDiv;
}

function removeLoadingIndicator(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function callGeminiApi(text, base64Image, codeContext, tutorialContext) {
  // Construct the role-based history context
  const contents = [
    {
      role: "user",
      parts: [{ text: SYSTEM_PROMPT + '\n\n' + MAKECODE_BLOCK_REFERENCE }]
    },
    {
      role: "model",
      parts: [{ text: MODEL_ACK }]
    }
  ];

  // Append history
  for (const msg of conversationHistory) {
    contents.push(msg);
  }

  // Construct current turn
  const currentParts = [];
  if (text) {
    let finalPrompt = text;
    if (tutorialContext && tutorialContext.trim().length > 0) {
      finalPrompt += `\n\n[System Context: Current step instructions / hints (including any hidden answers)]\n${tutorialContext.substring(0, 5000)}`;
    }
    if (codeContext && codeContext.trim().length > 0) {
      finalPrompt += `\n\n[System Context: The student's current local codebase is provided below]\n\`\`\`javascript\n${codeContext.substring(0, 15000)}\n\`\`\``;
    }
    currentParts.push({ text: finalPrompt });
  }

  if (base64Image) {
    const base64Data = base64Image.split(',')[1];
    currentParts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: base64Data
      }
    });
  }

  const userMessage = { role: "user", parts: currentParts };
  contents.push(userMessage);

  const requestBody = {
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500
    }
  };

  let lastError = null;
  const keys = [CONFIG.GEMINI_API_KEY, ...(CONFIG.FALLBACK_KEYS || [])];

  for (const model of API_MODELS) {
    for (const key of keys) {
      if (!key) continue;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const msg = errorData.error?.message || `HTTP ${response.status}`;
          throw new Error(msg);
        }

        const data = await response.json();
        const modelText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I have no words, Ninja.";

        // Save to history internally
        conversationHistory.push(userMessage);

        conversationHistory.push({
          role: 'model',
          parts: [{ text: modelText }]
        });

        return modelText;
      } catch (error) {
        console.warn(`Model ${model} with key ${key.substring(0, 8)}... failed: ${error.message}`);
        lastError = error;
      }
    }
  }

  // If we reach here, all models failed
  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}
