/**
 * AIGard Popup with i18n support
 */

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MAX_CHUNK_SIZE = 5000;

// AI phrases moved to analyzer.js - using advanced analysis

let settings = { apiKey: '', model: 'mistral-small-latest' };

// i18n helper
function t(key, ...args) {
  let msg = chrome.i18n.getMessage(key) || key;
  args.forEach((arg, i) => {
    msg = msg.replace(`$${i + 1}`, arg);
  });
  return msg;
}

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

async function init() {
  applyTranslations();
  await loadSettings();
  updateStatus();
  setupTabs();
  setupAnalyze();
  setupSettings();
}

function applyTranslations() {
  // Tabs
  const tabAnalyze = document.getElementById('tabAnalyze');
  const tabSettings = document.getElementById('tabSettings');
  if (tabAnalyze) tabAnalyze.textContent = t('analyze');
  if (tabSettings) tabSettings.textContent = t('settings');
  
  // Analyze panel
  const textInput = document.getElementById('textInput');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const scoreLabel = document.getElementById('scoreLabel');
  if (textInput) textInput.placeholder = t('placeholder');
  if (analyzeBtn) analyzeBtn.textContent = t('analyzeBtn');
  if (scoreLabel) scoreLabel.textContent = t('aiScore');
  
  // Settings panel
  const infoBox = document.getElementById('infoBox');
  const apiKeyLabel = document.getElementById('apiKeyLabel');
  const apiKey = document.getElementById('apiKey');
  const modelLabel = document.getElementById('modelLabel');
  const optSmall = document.getElementById('optSmall');
  const optLarge = document.getElementById('optLarge');
  const saveSettings = document.getElementById('saveSettings');
  
  if (infoBox) infoBox.innerHTML = `${t('infoBox')} <a href="https://console.mistral.ai" target="_blank">console.mistral.ai</a>`;
  if (apiKeyLabel) apiKeyLabel.textContent = t('apiKeyLabel');
  if (apiKey) apiKey.placeholder = t('apiKeyPlaceholder');
  if (modelLabel) modelLabel.textContent = t('modelLabel');
  if (optSmall) optSmall.textContent = t('modelSmall');
  if (optLarge) optLarge.textContent = t('modelLarge');
  if (saveSettings) saveSettings.textContent = t('saveBtn');
}

async function loadSettings() {
  try {
    const stored = await chrome.storage.local.get(['aigardSettings']);
    if (stored?.aigardSettings) {
      settings = { ...settings, ...stored.aigardSettings };
    }
  } catch (e) {}
  
  const apiKeyEl = document.getElementById('apiKey');
  const modelEl = document.getElementById('model');
  if (apiKeyEl) apiKeyEl.value = settings.apiKey || '';
  if (modelEl) modelEl.value = settings.model || 'mistral-small-latest';
}

function updateStatus() {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (!dot || !text) return;
  
  if (settings.apiKey) {
    dot.className = 'status-dot online';
    text.textContent = t('ready');
  } else {
    dot.className = 'status-dot offline';
    text.textContent = t('noApiKey');
  }
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById(tab.dataset.panel);
      if (panel) panel.classList.add('active');
    });
  });
}

function setupSettings() {
  const saveBtn = document.getElementById('saveSettings');
  if (!saveBtn) return;
  
  saveBtn.addEventListener('click', async () => {
    const apiKeyEl = document.getElementById('apiKey');
    const modelEl = document.getElementById('model');
    
    settings.apiKey = apiKeyEl?.value.trim() || '';
    settings.model = modelEl?.value || 'mistral-small-latest';
    
    try {
      await chrome.storage.local.set({ aigardSettings: settings });
    } catch (e) {}
    
    updateStatus();
    saveBtn.textContent = t('saved');
    setTimeout(() => saveBtn.textContent = t('saveBtn'), 1500);
  });
}

function setupAnalyze() {
  const btn = document.getElementById('analyzeBtn');
  const input = document.getElementById('textInput');
  if (!btn) return;
  
  btn.addEventListener('click', async () => {
    const text = input?.value.trim() || '';
    
    if (!text) {
      showError(t('errorNoText'));
      return;
    }
    if (text.length < 50) {
      showError(t('errorShort'));
      return;
    }
    if (!settings.apiKey) {
      showError(t('errorNoKey'));
      return;
    }
    
    await runAnalysis(text);
  });
}

async function runAnalysis(text) {
  const btn = document.getElementById('analyzeBtn');
  const progress = document.getElementById('progress');
  
  if (btn) btn.disabled = true;
  hideError();
  hideResult();
  if (progress) progress.classList.add('show');
  
  try {
    const chunks = splitIntoChunks(text, MAX_CHUNK_SIZE);
    const results = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const pct = Math.round(((i + 0.5) / chunks.length) * 80) + 10;
      updateProgress(pct, t('analyzingChunk', i + 1, chunks.length));
      
      const local = analyzeLocal(chunks[i]);
      const mistral = await callMistralAPI(chunks[i]);
      results.push({ local, mistral });
    }
    
    updateProgress(95, t('combining'));
    const result = combineResults(results);
    
    updateProgress(100, t('done'));
    setTimeout(() => {
      if (progress) progress.classList.remove('show');
      displayResult(result);
    }, 200);
    
  } catch (e) {
    if (progress) progress.classList.remove('show');
    showError(e.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function splitIntoChunks(text, maxSize) {
  if (text.length <= maxSize) return [text];
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxSize && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += (current ? ' ' : '') + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.substring(0, maxSize)];
}

function analyzeLocal(text) {
  // Debug: check if analyzeText is available
  console.log('analyzeText available:', typeof analyzeText === 'function');
  
  // Use advanced analyzer from analyzer.js v11.0
  if (typeof analyzeText === 'function') {
    const result = analyzeText(text);
    console.log('Local analysis result:', result);
    const s = result.scores || {};
    
    return {
      // Basic metrics for display - v11.0 format
      lexDiv: (result.ttr || 50) / 100,
      std: result.sentenceStd || 0,
      avg: result.sentenceAvg || 0,
      found: result.aiPhrases || [],
      prob: result.localAiProb || 0,
      confidence: result.confidence || 'medium',
      
      // v11.0 metrics
      perfection: s.perfection || 0,
      drift: s.drift || 0,
      connectors: s.connectors || 0,
      perplexity: s.perplexity || 0,
      burstiness: s.burstiness || 0,
      formal: s.formal || 0,
      frankenstein: s.frankenstein || 0,
      
      // Flags
      isPerfect: result.isPerfect || false,
      isFrankenstein: result.isFrankenstein || false,
      hasSlangWithLogic: result.hasSlangWithLogic || false,
      
      // Human-readable explanation
      explanation: result.explanation || '',
      
      scores: result.scores || {}
    };
  }
  
  console.log('FALLBACK: analyzeText not available!');
  // Fallback
  const words = text.toLowerCase().match(/\b[a-zа-яё]+\b/g) || [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const lexDiv = words.length ? new Set(words).size / words.length : 0;
  const lens = sentences.map(s => (s.match(/\b[a-zа-яё]+\b/gi) || []).length);
  const avg = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const variance = lens.length > 1 ? lens.reduce((s, l) => s + (l - avg) ** 2, 0) / lens.length : 0;
  const std = Math.sqrt(variance);
  
  return { lexDiv, std, avg, found: [], prob: 0.5, confidence: 'low', scores: {} };
}

async function callMistralAPI(text) {
  const prompt = `You are an expert AI text detector for 2025. Analyze if this text is AI-generated.

CRITICAL RULES:
1. Specific facts, numbers, names, dates do NOT indicate human authorship - modern AI (GPT-5, Gemini 3, Claude) can generate highly specific content
2. Focus on STRUCTURAL patterns: bureaucratic style, passive voice, uniform sentence length, linear logic flow
3. "Канцеляризмы" (bureaucratic phrases) like "резюмируя вышеизложенное", "можно констатировать", "в рамках", "на основании" are STRONG AI indicators
4. Perfect grammar and "too correct" writing style indicates AI
5. Uniform information density across paragraphs indicates AI

Return JSON only:
{"label":"HUMAN"/"AI"/"MIXED","confidence":0-1,"ai_probability":0-1,"suspicious_phrases":[],"reasoning":"brief explanation focusing on structure, not content"}

Text to analyze:
"${text.substring(0, 6000)}"`;

  const res = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })
  });
  
  if (!res.ok) {
    if (res.status === 401) throw new Error(t('errorInvalidKey'));
    if (res.status === 429) throw new Error(t('errorRateLimit'));
    throw new Error(`API error ${res.status}`);
  }
  
  const data = await res.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return { label: 'MIXED', confidence: 0.5, ai_probability: 0.5, suspicious_phrases: [], reasoning: '' };
  }
}

function combineResults(results) {
  if (!results.length) return { aiScore: 50, label: 'UNKNOWN' };
  
  let lp = 0, mp = 0, conf = 0, lex = 0, std = 0;
  const phrases = [];
  let reason = '';
  let localExplanation = '';
  
  // v11.0 metrics aggregation
  let perfection = 0, drift = 0, connectors = 0, perplexity = 0, burstiness = 0, frankenstein = 0;
  let localConfidence = 'medium';
  let hasPerfect = false, hasSlangLogic = false, hasFrankenstein = false;
  
  for (const r of results) {
    lp += r.local.prob;
    mp += r.mistral.ai_probability || 0.5;
    conf += r.mistral.confidence || 0.5;
    lex += r.local.lexDiv || 0.5;
    std += r.local.std || 0;
    phrases.push(...(r.local.found || []), ...(r.mistral.suspicious_phrases || []));
    if (!reason && r.mistral.reasoning) reason = r.mistral.reasoning;
    if (!localExplanation && r.local.explanation) localExplanation = r.local.explanation;
    
    // Aggregate v11.0 metrics
    perfection += r.local.perfection || 0;
    drift += r.local.drift || 0;
    connectors += r.local.connectors || 0;
    perplexity += r.local.perplexity || 0;
    burstiness += r.local.burstiness || 0;
    frankenstein += r.local.frankenstein || 0;
    
    if (r.local.isPerfect) hasPerfect = true;
    if (r.local.hasSlangWithLogic) hasSlangLogic = true;
    if (r.local.isFrankenstein) hasFrankenstein = true;
    
    if (r.local.confidence === 'high') localConfidence = 'high';
    else if (r.local.confidence === 'low' && localConfidence !== 'high') localConfidence = 'low';
  }
  
  const n = results.length;
  const localProb = lp / n;
  const mistralProb = mp / n;
  
  console.log('Local prob:', localProb, 'Mistral prob:', mistralProb);
  
  // v11.0: 90% local, 10% Mistral
  let combined = localProb * 0.90 + mistralProb * 0.10;
  
  // If local shows ANY AI signal (>0.3), boost it
  if (localProb >= 0.30) {
    combined = Math.max(combined, localProb * 0.95);
  }
  
  const score = Math.round(combined * 100);
  
  let label = 'MIXED';
  if (combined < 0.25) label = 'HUMAN';
  else if (combined > 0.40) label = 'AI';
  
  // Confidence calculation
  const mistralConf = conf / n;
  const finalConfidence = localProb >= 0.50 ? 0.92 : localProb >= 0.35 ? 0.78 : mistralConf;
  
  // Use local explanation if available, otherwise Mistral reasoning
  const finalExplanation = localExplanation || reason || t('analysisComplete');
  
  return {
    aiScore: score,
    label,
    confidence: finalConfidence,
    chunks: n,
    metrics: { 
      lexical: ((lex / n) * 100).toFixed(1), 
      variation: (std / n).toFixed(1)
    },
    // v11.0 advanced metrics
    advancedMetrics: {
      perfection: Math.round(perfection / n),
      drift: Math.round(drift / n),
      connectors: Math.round(connectors / n),
      perplexity: Math.round(perplexity / n),
      burstiness: Math.round(burstiness / n),
      frankenstein: Math.round(frankenstein / n)
    },
    phrases: [...new Set(phrases)].slice(0, 15),
    explanation: finalExplanation,
    localConfidence,
    localProb: Math.round(localProb * 100),
    mistralProb: Math.round(mistralProb * 100),
    isPerfect: hasPerfect,
    isFrankenstein: hasFrankenstein,
    hasSlangWithLogic: hasSlangLogic
  };
}

function updateProgress(pct, text) {
  const fill = document.getElementById('progressFill');
  const textEl = document.getElementById('progressText');
  if (fill) fill.style.width = pct + '%';
  if (textEl) textEl.textContent = text;
}

function displayResult(result) {
  const container = document.getElementById('result');
  if (!container) return;
  container.classList.add('show');
  
  const scoreEl = document.getElementById('scoreValue');
  if (scoreEl) {
    scoreEl.textContent = result.aiScore;
    scoreEl.className = 'score-value ' + result.label.toLowerCase();
  }
  
  const badge = document.getElementById('labelBadge');
  if (badge) {
    badge.textContent = t(result.label.toLowerCase());
    badge.className = 'label-badge ' + result.label.toLowerCase();
  }
  
  const metricsEl = document.getElementById('metrics');
  if (metricsEl) {
    let metricsHtml = `
      <div class="metric-row"><span class="metric-label">${t('lexicalDiversity')}</span><span class="metric-value">${result.metrics.lexical}%</span></div>
      <div class="metric-row"><span class="metric-label">${t('sentenceVariation')}</span><span class="metric-value">${result.metrics.variation}</span></div>
      <div class="metric-row"><span class="metric-label">${t('confidence')}</span><span class="metric-value">${(result.confidence * 100).toFixed(0)}%</span></div>
    `;
    
    // Add v11.0 advanced metrics
    if (result.advancedMetrics) {
      const adv = result.advancedMetrics;
      metricsHtml += `
        <div class="metric-divider"></div>
        <div class="metric-row"><span class="metric-label">Идеальность</span><span class="metric-value">${adv.perfection}%</span></div>
        <div class="metric-row"><span class="metric-label">Логичность</span><span class="metric-value">${adv.drift}%</span></div>
        <div class="metric-row"><span class="metric-label">Клише</span><span class="metric-value">${adv.connectors}%</span></div>
        <div class="metric-row"><span class="metric-label">Предсказуемость</span><span class="metric-value">${adv.perplexity}%</span></div>
        <div class="metric-row"><span class="metric-label">Однообразие</span><span class="metric-value">${adv.burstiness}%</span></div>
        <div class="metric-row"><span class="metric-label">Франкенштейн</span><span class="metric-value">${adv.frankenstein || 0}%</span></div>
      `;
    }
    
    if (result.chunks > 1) {
      metricsHtml += `<div class="metric-row"><span class="metric-label">${t('chunks')}</span><span class="metric-value">${result.chunks}</span></div>`;
    }
    
    metricsEl.innerHTML = metricsHtml;
  }
  
  const expEl = document.getElementById('explanation');
  if (expEl) expEl.textContent = result.explanation;
  
  const phrasesEl = document.getElementById('phrases');
  if (phrasesEl) {
    phrasesEl.innerHTML = result.phrases.length
      ? `<div class="phrases-title">${t('suspiciousPhrases')}</div>${result.phrases.map(p => `<span class="phrase">${p}</span>`).join('')}`
      : '';
  }
}

function showError(msg) {
  const el = document.getElementById('error');
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

function hideError() {
  const el = document.getElementById('error');
  if (el) el.classList.remove('show');
}

function hideResult() {
  const el = document.getElementById('result');
  if (el) el.classList.remove('show');
}
