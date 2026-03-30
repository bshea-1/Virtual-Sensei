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
      }

      const initialMsg = `<p>Hey Ninja! 🥷 I'm your Virtual Sensei. Tell me what you're working on, and we'll figure it out together!</p>`;
      addMessageDirect(initialMsg, 'sensei', false);
      saveSession();
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
      }

      chrome.runtime.sendMessage({ action: 'TRIGGER_CLOSE_HELP' }).catch(() => { });

      const checkMsg = `<p>Sensei check complete! ✨ What's next on our quest?</p>`;
      addMessageDirect(checkMsg, 'sensei', false);
      saveSession();
    });
  }

  // Send Prompt (Enter key without shift)
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  });

  // Auto-resize textarea
  promptInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });

  // Send Prompt (Button click)
  sendBtn.addEventListener('click', handleSendPrompt);
});

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
  const prompt = promptInput.value.trim();

  if (!prompt) return;

  if (!CONFIG.GEMINI_API_KEY) {
    addMessageToChat('Please configure your Gemini API Key in config.js.', 'sensei', true);
    return;
  }

  // Add user message to UI
  let displayHTML = `<p>${escapeHtml(prompt).replace(/\n/g, '<br>')}</p>`;
  addMessageDirect(displayHTML, 'student', false);

  promptInput.value = '';
  promptInput.style.height = 'auto';
  sendBtn.disabled = true;

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
    if (responseText.includes('[NINJA_BOOST]')) {
      requiredBoost = true;
      responseText = responseText.replace(/\[NINJA_BOOST\]/g, '').trim();
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
    addMessageToChat(`Error: ${error.message}`, 'sensei', true);
  } finally {
    if (!isBoostMode) sendBtn.disabled = false;
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
  displayMessages.push({ html: htmlContent, senderClass, isError });
  saveSession();
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
  formattedText = formattedText.replace(/\[\[([A-Za-z]+):\s*([^\]]+)\]\]/gi, (match, category, textContent) => {
    const catLower = category.trim().toLowerCase();

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
  loadingDiv.classList.add('loading');
  loadingDiv.id = 'loading-indicator-div';
  loadingDiv.innerHTML = 'Sensei thinking... <span id="loading-pct" style="margin-left: 4px; font-weight: bold; color: var(--brand);">0%</span> <span class="dots" style="margin-left: 4px;">💭</span>';
  chatContainer.appendChild(loadingDiv);
  scrollToBottom();

  let currentProgress = 0;
  const intervalId = setInterval(() => {
    currentProgress += Math.floor(Math.random() * 11) + 2;
    if (currentProgress > 99) currentProgress = 99;
    const pctSpan = document.getElementById('loading-pct');
    if (pctSpan) pctSpan.textContent = currentProgress + '%';
  }, 150);

  loadingDiv.dataset.intervalId = intervalId.toString();
  return loadingDiv;
}

function removeLoadingIndicator(element) {
  if (element) {
    if (element.dataset.intervalId) {
      clearInterval(Number(element.dataset.intervalId));
    }
    if (element.parentNode) {
      const pctSpan = element.querySelector('#loading-pct');
      if (pctSpan) pctSpan.textContent = '100%';
      setTimeout(() => {
        if (element.parentNode) element.parentNode.removeChild(element);
      }, 300);
    }
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
