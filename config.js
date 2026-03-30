/*
 * Virtual Sensei
 * Copyright (c) 2026 Brennan Shea. All rights reserved.
 * Unauthorized use, copying, or distribution is strictly prohibited.
 * See LICENSE file for details.
 */

// config.example.js
// Place your Gemini API Key here. Copy this file to "config.js" locally.
// You can add up to 3 fallback keys in the array below
// If you have more than 3 keys, the extra ones will be ignored
// Keys retrieved from here: https://aistudio.google.com/api-keys
export const CONFIG = {
  GEMINI_API_KEY: 'GEMINI_API_KEY,
  FALLBACK_KEYS: [
    'FALLBACK_KEY_1',
    'FALLBACK_KEY_2',
    'FALLBACK_KEY_3'
  ]
};
