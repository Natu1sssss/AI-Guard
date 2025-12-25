/**
 * AIGard Background Service Worker
 * AI-generated content detection using hybrid analysis
 * 
 * Features:
 * - Two-tier marker system (strong/weak human indicators)
 * - Structural text analysis (perfection, burstiness, drift)
 * - Mistral AI integration for enhanced detection
 */

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MAX_CHUNK_SIZE = 5000;

function t(key) { return chrome.i18n.getMessage(key) || key; }

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'aigard-detect', title: t('contextMenuTitle'), contexts: ['selection'] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'aigard-detect' || !info.selectionText) return;
  const text = info.selectionText.trim();
  if (text.length < 50) { await showOnPage(tab.id, 'error', t('errorShort')); return; }
  await showOnPage(tab.id, 'loading', t('analyzing'));
  try {
    const settings = await getSettings();
    if (!settings.apiKey) { await showOnPage(tab.id, 'error', t('errorNoKey')); return; }
    const result = await runAnalysis(text, settings);
    result.labels = { aiScore: t('aiScore'), lexical: t('lexicalDiversity'), variation: t('sentenceVariation'), confidence: t('confidence'), suspicious: t('suspiciousPhrases'), labelText: t(result.label.toLowerCase()) };
    await showOnPage(tab.id, 'result', result);
  } catch (e) { await showOnPage(tab.id, 'error', e.message); }
});

async function showOnPage(tabId, type, data) {
  try { await chrome.tabs.sendMessage(tabId, { action: 'show', type, data }); }
  catch { try { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); await chrome.tabs.sendMessage(tabId, { action: 'show', type, data }); } catch (e2) { console.error('Could not show:', e2); } }
}

async function getSettings() { const data = await chrome.storage.local.get(['aigardSettings']); return data.aigardSettings || {}; }

// Text neutralization - removes specific identifiers
function neutralize(text) {
  let n = text;
  n = n.replace(/\d+([.,]\d+)?\s*(л\.?\s*с|hp|кг|kg|км|km|м|г|мл|gb|mb|тыс|руб|₽|\$|€|%)/gi, '[SPEC]');
  n = n.replace(/\d{4}\s*(год|г\.?|года|году|year)?/gi, '[YEAR]');
  n = n.replace(/\d+/g, '[NUM]');
  n = n.replace(/\b(lada|лада|калина|приора|веста|toyota|тойота|bmw|бмв|mercedes|мерседес|audi|volkswagen|honda|ford|kia|киа|hyundai|хендай|nissan|mazda|iphone|айфон|samsung|самсунг|xiaomi|huawei|google|гугл|apple|эпл|microsoft)\b/gi, '[BRAND]');
  n = n.replace(/\b(москва|москве|питер|спб|россия|россии|украина|сша|usa|америка|европа|китай|германия|франция)\b/gi, '[PLACE]');
  return n;
}

// Analyzes predictable connector patterns
function analyzeConnectors(text) {
  const perfectCliches = [
    /^тут такое дело/im, /^ну,?\s*(ты\s+)?знаешь/im, /^короче,?\s/im, /^смотри,?\s/im,
    /и в (этом|том|её|его) .{0,20}было/i, /,?\s*если честно[.,]?$/im, /,?\s*на самом деле/i,
    /,?\s*по большому счёту/i, /типа того/i, /вот и всё/i, /вот такие дела/i,
    /^here's the thing/im, /^you know what/im, /,?\s*to be honest[.,]?$/im, /,?\s*at the end of the day/i
  ];
  const imperfectPatterns = [/такое тут дело/i, /знаешь,?\s*ну/i, /честно если/i];
  
  let perfect = 0, imperfect = 0;
  for (const p of perfectCliches) if (p.test(text)) perfect++;
  for (const p of imperfectPatterns) if (p.test(text)) imperfect++;
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const density = sentences.length > 0 ? perfect / sentences.length : 0;
  
  let score = density > 0.3 ? 0.90 : density > 0.2 ? 0.75 : density > 0.1 ? 0.55 : perfect >= 3 ? 0.65 : perfect >= 2 ? 0.45 : perfect >= 1 ? 0.30 : 0.15;
  if (imperfect > 0) score *= 0.6;
  
  return { score, perfect, imperfect };
}

// Analyzes semantic drift and topic continuity
function analyzeDrift(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 8);
  if (sentences.length < 4) return { score: 0.5, hasSlang: false, continuity: 50, hasDrift: false };
  
  const slangPatterns = [/\b(блин|чёрт|бля|капец|жесть|короче|кароче|типа|ваще|чё|норм)\b/gi, /\b(damn|shit|fuck|dude|gonna|wanna|kinda)\b/gi];
  let slangCount = 0;
  for (const p of slangPatterns) { const m = text.match(p); if (m) slangCount += m.length; }
  const hasSlang = slangCount >= 2;
  
  const stopwords = new Set(['и','в','на','с','что','как','это','но','а','the','a','is','are','was','i','you','he','she','it','we','they','this','that']);
  const topics = sentences.map(s => (s.toLowerCase().match(/\b[a-zа-яё]{4,}\b/g) || []).filter(w => !stopwords.has(w)));
  
  let continuity = 0, tangents = 0;
  for (let i = 1; i < topics.length; i++) {
    const prev = new Set(topics[i-1]);
    const shared = topics[i].filter(w => prev.has(w)).length;
    if (shared > 0) continuity++;
    if (i < topics.length - 1) {
      const next = new Set(topics[i+1]);
      if (shared === 0 && topics[i].filter(w => next.has(w)).length === 0 && topics[i].length > 0) tangents++;
    }
  }
  
  const ratio = (sentences.length - 1) > 0 ? (continuity / (sentences.length - 1)) * 100 : 50;
  const hasDrift = tangents > 0;
  
  let score = (hasSlang && ratio > 85) ? 0.85 : (hasSlang && ratio > 70) ? 0.70 : (!hasSlang && ratio > 90) ? 0.60 : ratio > 80 ? 0.50 : hasDrift ? 0.20 : 0.35;
  
  return { score, hasSlang, continuity: Math.round(ratio), hasDrift, tangents };
}

// Detects text perfection (AI tends to produce flawless text)
function detectPerfection(text) {
  const words = text.toLowerCase().match(/\b[a-zа-яё]{4,}\b/g) || [];
  const counts = {};
  for (const w of words) counts[w] = (counts[w] || 0) + 1;
  
  const common = new Set(['было','быть','этот','который','можно','нужно','очень','более','также','have','been','this','that','with','from','they','would','could','should','there','their','about','which','when','what','were','will','your','some','them','than','then']);
  let repFlaws = 0;
  for (const [w, c] of Object.entries(counts)) if (c >= 3 && !common.has(w) && w.length > 4) repFlaws++;
  
  const grammarFlaws = [/\s{2,}/g, /[,]{2,}/g].reduce((n, p) => n + (text.match(p) || []).length, 0);
  const strangeCount = [/\.{3}\s*[а-яёa-z]/g, /[!?]\s*[а-яёa-z]/g, /—\s*$/gm].reduce((n, p) => n + (text.match(p) || []).length, 0);
  const corrections = [/\b(то есть|в смысле|точнее|вернее|i mean|actually|wait|no)\b/gi].reduce((n, p) => n + (text.match(p) || []).length, 0);
  
  const total = repFlaws + grammarFlaws + strangeCount + corrections;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const density = sentences.length > 0 ? total / sentences.length : 0;
  const isPerfect = total === 0 && sentences.length >= 3;
  
  let score = isPerfect && sentences.length >= 5 ? 0.95 : isPerfect ? 0.85 : density < 0.1 && sentences.length >= 5 ? 0.75 : density < 0.2 ? 0.55 : density < 0.3 ? 0.35 : 0.15;
  
  return { score, total, isPerfect, corrections };
}

// Analyzes text perplexity and predictability
function analyzePerplexity(text) {
  const words = text.toLowerCase().match(/\b[a-zа-яё]{2,}\b/g) || [];
  if (words.length < 15) return { score: 0.5, sequences: 0 };
  
  const seqs = ['в первую очередь','в конечном итоге','на самом деле','тем не менее','следует отметить','важно отметить','таким образом','it is important','in order to','as a result','in conclusion'];
  let seqCount = seqs.filter(s => text.toLowerCase().includes(s)).length;
  
  const bigrams = {};
  for (let i = 1; i < words.length; i++) bigrams[`${words[i-1]}|${words[i]}`] = (bigrams[`${words[i-1]}|${words[i]}`] || 0) + 1;
  
  let highProb = 0, total = 0;
  for (let i = 1; i < words.length; i++) {
    const followers = Object.entries(bigrams).filter(([k]) => k.startsWith(`${words[i-1]}|`)).sort((a,b) => b[1]-a[1]);
    if (followers.length > 1) { total++; if (followers[0][0].split('|')[1] === words[i]) highProb++; }
  }
  
  const pred = total > 0 ? highProb / total : 0;
  const combined = (seqCount > 0 ? 0.4 : 0) + pred * 0.6;
  let score = combined > 0.50 ? 0.95 : combined > 0.35 ? 0.80 : combined > 0.25 ? 0.65 : combined > 0.15 ? 0.45 : 0.20;
  
  return { score, sequences: seqCount };
}

// Analyzes sentence complexity variation (burstiness)
function analyzeBurstiness(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
  if (sentences.length < 3) return { score: 0.5, cv: 50 };
  
  const complexities = sentences.map(s => s.trim().split(/\s+/).length + (s.match(/,/g) || []).length * 2 + (s.match(/—/g) || []).length * 3);
  const avg = complexities.reduce((a,b) => a+b, 0) / complexities.length;
  const std = Math.sqrt(complexities.reduce((s,c) => s + Math.pow(c-avg, 2), 0) / complexities.length);
  const cv = avg > 0 ? (std / avg) * 100 : 0;
  
  let score = cv < 20 ? 0.90 : cv < 30 ? 0.70 : cv < 40 ? 0.50 : cv < 55 ? 0.30 : 0.15;
  return { score, cv: Math.round(cv), std, avg };
}

// Analyzes formal structure patterns
function analyzeFormal(text) {
  let score = 0;
  const numbered = (text.match(/^\s*\d+[.)]\s/gm) || []).length;
  if (numbered >= 5) score += 0.50; else if (numbered >= 3) score += 0.35; else if (numbered >= 1) score += 0.15;
  const headers = (text.match(/^[А-ЯЁA-Z][а-яёa-z\s]{2,}:/gm) || []).length;
  if (headers >= 3) score += 0.30; else if (headers >= 1) score += 0.15;
  return { score: Math.min(1, score), numbered, headers };
}

// Human marker dictionary - phrases rarely used by AI
const HUMAN_MARKER_DICTIONARY = {
  idioms: [
    'пляска святого витта', 'корень зла', 'божеский вид', 'ни богу свечка', 'ни черту кочерга',
    'горе-мастер', 'горе-специалист', 'чудо в перьях', 'ни рыба ни мясо', 'ни два ни полтора',
    'гаражная магия', 'колхозный тюнинг', 'совковый подход', 'руки чешутся', 'глаза разбегаются',
    'мурашки по коже', 'кровь из глаз', 'мозг выносит', 'крышу сносит',
    'как мертвому припарка', 'собаку съел', 'как с гуся вода', 'на честном слове'
  ],
  technical: [
    'прикипело', 'сорвал резьбу', 'закис болт', 'пробило прокладку', 'на соплях',
    'синяя изолента', 'вэдэшка', 'смерть мотору', 'хрустит граната', 'жрет бензин',
    '8-клапанная', '8-клапанник', '16-клапанка', '16-клапанник', 'шеснарь', 'восьмиклоп',
    'грм', 'цепь грм', 'ремень грм', 'метки грм', 'выставить метки', 'гнуть клапана', 'загнуло клапана',
    'ремень генератора', 'ролик натяжителя', 'помпа', 'термостат заклинил',
    'тосол', 'антифриз', 'фриз', 'ож', 'охлаждайка',
    'заглушка', 'сальник', 'прокладка клапанной', 'маслосъемные',
    'тяга', 'рулевые наконечники', 'шаровая', 'сайлентблок',
    'на низах', 'на верхах', 'тянет', 'не тянет', 'троит', 'двоит',
    'масложор', 'жрет масло', 'дымит', 'сизый дым', 'белый дым',
    'стартер крутит', 'не заводится', 'схватывает', 'глохнет',
    'форсунки', 'инжектор', 'карбюратор', 'карб', 'солекс', 'озон',
    'свечи', 'катушка', 'бронепровода', 'трамблер', 'датчик коленвала'
  ],
  slang: [
    'кринж', 'кринжатина', 'рофл', 'треш', 'дичь', 'годнота', 'на изи', 'по фану',
    'инфа сотка', 'хайп', 'баян', 'жиза', 'рил', 'душнила', 'токсик'
  ],
  conversational: [
    'врать не буду', 'чего греха таить', 'положа руку на сердце',
    'как сейчас помню', 'давным-давно', 'на авось', 'как-то раз',
    'блин', 'ёлки', 'ёлки-палки', 'ёпрст', 'чёрт', 'черт возьми',
    'короче', 'ну вот', 'слушай', 'смотри', 'знаешь'
  ]
};

// Strong human markers - definitive human indicators
const STRONG_HUMAN_MARKERS = [
  'масложор', 'на соплях', 'гаражная магия', 'колхозный тюнинг',
  'грм', '8-клапанная', '16-клапанка', 'шеснарь', 'загнуло клапана',
  'троит', 'двоит', 'восьмиклоп', 'вэдэшка', 'синяя изолента',
  'кринж', 'жиза', 'рил', 'инфа сотка', 'годнота', 'дичь', 'треш',
  'говнокод', 'костыль', 'хотфикс', 'баян', 'душнила',
  'крышу сносит', 'мозг выносит', 'кровь из глаз',
  'собаку съел', 'как с гуся вода', 'ни рыба ни мясо',
  'блин', 'чёрт', 'ёлки-палки', 'капец', 'жесть'
];

// Weak human markers - AI also uses these
const WEAK_HUMAN_MARKERS = [
  'наверное', 'наверно', 'возможно', 'вероятно', 'пожалуй',
  'видимо', 'похоже', 'кажется', 'мне кажется', 'я думаю',
  'вроде', 'вроде бы', 'вроде как', 'как бы',
  'на самом деле', 'честно говоря', 'в общем', 'в общем-то',
  'собственно', 'кстати', 'между прочим',
  'если честно', 'по правде говоря'
];

// Counts human markers in text
function countHumanMarkers(text) {
  const textLower = text.toLowerCase();
  
  let strongCount = 0;
  const strongFound = [];
  let weakCount = 0;
  const weakFound = [];
  
  for (const marker of STRONG_HUMAN_MARKERS) {
    if (textLower.includes(marker.toLowerCase())) {
      strongCount++;
      strongFound.push(marker);
    }
  }
  
  for (const marker of WEAK_HUMAN_MARKERS) {
    if (textLower.includes(marker.toLowerCase())) {
      weakCount++;
      weakFound.push(marker);
    }
  }
  
  const allDictionary = [].concat(...Object.values(HUMAN_MARKER_DICTIONARY));
  for (const marker of allDictionary) {
    if (textLower.includes(marker.toLowerCase()) && !strongFound.includes(marker)) {
      strongCount++;
      strongFound.push(marker);
    }
  }
  
  return { strongCount, strongFound, weakCount, weakFound };
}

// Main local analysis function
function analyzeLocal(text) {
  const humanMarkers = countHumanMarkers(text);
  
  // Strong marker found - early exit with low AI probability
  if (humanMarkers.strongCount >= 1) {
    const prob = humanMarkers.strongCount >= 3 ? 0.05 : humanMarkers.strongCount >= 2 ? 0.10 : 0.20;
    return {
      prob,
      found: [`[HUMAN] ${humanMarkers.strongFound.slice(0, 3).join(', ')}`],
      cv: 50, std: 0, avg: 0,
      scores: { perfection: 10, drift: 10, connectors: 10, perplexity: 10, burstiness: 10 }
    };
  }
  
  // Many weak markers - likely human
  if (humanMarkers.weakCount >= 5) {
    return {
      prob: 0.25,
      found: [`[MARKERS] ${humanMarkers.weakCount} phrases: ${humanMarkers.weakFound.slice(0, 3).join(', ')}`],
      cv: 50, std: 0, avg: 0,
      scores: { perfection: 20, drift: 20, connectors: 20, perplexity: 20, burstiness: 20 }
    };
  }
  
  // Run full structural analysis
  const n = neutralize(text);
  
  const connectors = analyzeConnectors(text);
  const drift = analyzeDrift(n);
  const perfection = detectPerfection(text);
  const perplexity = analyzePerplexity(n);
  const burstiness = analyzeBurstiness(n);
  
  // Calculate weighted probability
  let prob = perfection.score * 0.30 + drift.score * 0.25 + connectors.score * 0.20 + perplexity.score * 0.15 + burstiness.score * 0.10;
  
  // Boost for strong AI signals
  if (perfection.isPerfect) prob = Math.max(prob, 0.90);
  if (drift.hasSlang && drift.continuity > 85) prob = Math.max(prob, 0.85);
  if (connectors.perfect >= 4) prob = Math.max(prob, 0.80);
  
  const strong = [perfection.score > 0.75, drift.score > 0.70, connectors.score > 0.65, perplexity.score > 0.60].filter(Boolean).length;
  if (strong >= 3) prob = Math.max(prob, 0.92);
  else if (strong >= 2) prob = Math.min(1, prob * 1.15);
  
  // Reduce for human signals
  if (drift.hasDrift && drift.tangents >= 2) prob *= 0.75;
  if (connectors.imperfect > 0) prob *= 0.80;
  if (perfection.total >= 3) prob *= 0.70;
  
  // Adjust for weak markers
  if (humanMarkers.weakCount >= 3) {
    prob *= 0.85;
  } else if (humanMarkers.weakCount >= 1) {
    prob *= 0.92;
  }
  
  const markers = [];
  if (perfection.isPerfect) markers.push('[AI] Perfect text');
  if (drift.hasSlang && drift.continuity > 80) markers.push('Slang with perfect logic');
  if (connectors.perfect > 0) markers.push(`${connectors.perfect} template phrases`);
  if (connectors.imperfect > 0) markers.push(`${connectors.imperfect} natural phrases`);
  if (drift.hasDrift) markers.push(`${drift.tangents} topic shifts`);
  if (perfection.total > 0) markers.push(`${perfection.total} imperfections`);
  if (perfection.corrections > 0) markers.push('Self-corrections');
  if (burstiness.cv < 30) markers.push(`Uniform structure CV=${burstiness.cv}%`);
  if (humanMarkers.weakCount > 0) markers.push(`${humanMarkers.weakCount} hedging phrases`);
  
  return { prob: Math.min(1, prob), found: markers, cv: burstiness.cv, std: burstiness.std, avg: burstiness.avg, scores: { perfection: Math.round(perfection.score*100), drift: Math.round(drift.score*100), connectors: Math.round(connectors.score*100), perplexity: Math.round(perplexity.score*100), burstiness: Math.round(burstiness.score*100) } };
}

async function runAnalysis(text, settings) {
  const chunks = splitChunks(text, MAX_CHUNK_SIZE);
  const results = [];
  for (const chunk of chunks) {
    const local = analyzeLocal(chunk);
    const mistral = await callMistral(chunk, settings);
    results.push({ local, mistral });
  }
  return combine(results);
}

function splitChunks(text, max) {
  if (text.length <= max) return [text];
  const chunks = [], sents = text.split(/(?<=[.!?])\s+/);
  let cur = '';
  for (const s of sents) { if ((cur + s).length > max && cur) { chunks.push(cur.trim()); cur = s; } else cur += (cur ? ' ' : '') + s; }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length ? chunks : [text.substring(0, max)];
}

async function callMistral(text, settings) {
  const prompt = `Expert AI detector. Analyze STRUCTURE, not content.

RULES:
1. Personal facts do NOT prove human - AI has memory
2. Perfect clichés in perfect positions = AI
3. Slang + perfect logical flow = AI pretending to be casual
4. NO FLAWS = likely AI
5. Self-corrections, tangents, incomplete thoughts = human signals

JSON only: {"label":"HUMAN"/"AI"/"MIXED","confidence":0-1,"ai_probability":0-1,"suspicious_phrases":[],"reasoning":"brief"}

Text: "${text.substring(0, 6000)}"`;

  const res = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: settings.model || 'mistral-small-latest', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 500, response_format: { type: 'json_object' } })
  });
  
  if (!res.ok) { if (res.status === 401) throw new Error(t('errorInvalidKey')); if (res.status === 429) throw new Error(t('errorRateLimit')); throw new Error(`API error ${res.status}`); }
  try { return JSON.parse((await res.json()).choices[0].message.content); }
  catch { return { label: 'MIXED', confidence: 0.5, ai_probability: 0.5, suspicious_phrases: [], reasoning: '' }; }
}

function combine(results) {
  if (!results.length) return { aiScore: 50, label: 'UNKNOWN', confidence: 0.5, chunks: 0, metrics: { lexical: '50.0', variation: '0.0' }, phrases: [], explanation: '' };
  
  let lp = 0, mp = 0, conf = 0, cv = 0, std = 0, avg = 0;
  const phrases = [];
  let reason = '';
  
  for (const r of results) {
    lp += r.local.prob;
    mp += r.mistral.ai_probability || 0.5;
    conf += r.mistral.confidence || 0.5;
    cv += r.local.cv || 50;
    std += r.local.std || 0;
    avg += r.local.avg || 0;
    phrases.push(...(r.local.found || []), ...(r.mistral.suspicious_phrases || []));
    if (!reason && r.mistral.reasoning) reason = r.mistral.reasoning;
  }
  
  const n = results.length;
  const localProb = lp / n;
  const mistralProb = mp / n;
  
  // Weighted combination: 90% local, 10% Mistral
  let combined = localProb * 0.90 + mistralProb * 0.10;
  if (localProb >= 0.30) combined = Math.max(combined, localProb * 0.95);
  
  const score = Math.round(combined * 100);
  let label = combined < 0.25 ? 'HUMAN' : combined > 0.40 ? 'AI' : 'MIXED';
  
  return {
    aiScore: score,
    label,
    confidence: localProb >= 0.50 ? 0.92 : localProb >= 0.35 ? 0.78 : conf / n,
    chunks: n,
    metrics: { 
      lexical: (100 - cv / n).toFixed(1),
      variation: (std / n).toFixed(1)
    },
    phrases: [...new Set(phrases)].slice(0, 15),
    explanation: reason || t('analysisComplete')
  };
}
