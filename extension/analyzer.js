/**
 * AIGard Text Analyzer
 * Local heuristic analysis for AI-generated content detection
 * 
 * Features:
 * - Human marker dictionary (idioms, slang, technical terms)
 * - Lexical richness analysis (TTR)
 * - Emotional marker detection
 * - Rhythmic pattern analysis
 * - Information density measurement
 */

// Human marker dictionary - phrases rarely used by AI
const HUMAN_MARKER_DICTIONARY = {
  // Folk idioms and expressions
  idioms: [
    'пляска святого витта', 'святого витта', 'корень зла', 'божеский вид',
    'привести в божеский', 'ни богу свечка', 'ни черту кочерга',
    'как бог на душу', 'бог весть', 'черт знает', 'леший знает',
    'горе-мастер', 'горе-специалист', 'горе-механик', 'горе-водитель',
    'чудо-юдо', 'диво дивное', 'чудо в перьях', 'птица редкая',
    'ни рыба ни мясо', 'ни два ни полтора', 'ни туда ни сюда',
    'гаражная магия', 'колхозный тюнинг', 'совковый подход',
    'руки чешутся', 'глаза разбегаются', 'уши вянут', 'волосы дыбом',
    'мурашки по коже', 'сердце ёкнуло', 'душа не на месте',
    'кровь из глаз', 'мозг выносит', 'крышу сносит',
    'как мертвому припарка', 'на козе не подъедешь', 'с боку припека',
    'от корки до корки', 'через пень-колоду', 'как кур в ощип', 'собаку съел',
    'в ус не дует', 'как с гуся вода', 'палец о палец', 'с горем пополам',
    'на вольные хлеба', 'куда макар телят не гонял', 'семь верст до небес',
    'как снег на голову', 'из пальца высосано', 'черным по белому',
    'с иголочки', 'на честном слове', 'как на дрожжах', 'не разлей вода'
  ],
  
  // Technical/automotive jargon
  technical: [
    'прикипело', 'сорвал резьбу', 'закис болт', 'пробило прокладку', 'шлифануть',
    'на соплях', 'синяя изолента', 'вэдэшка', 'вэдэхой брызнуть', 'в гаражах',
    'смерть мотору', 'жижа', 'залипуха', 'хрустит граната',
    'стучат пальцы', 'пальцы звенят', 'жрет бензин', 'подсос воздуха',
    '8-клапанная', '8-клапанник', '16-клапанка', '16-клапанник', 'шеснарь', 'восьмиклоп',
    'грм', 'цепь грм', 'ремень грм', 'метки грм', 'выставить метки',
    'гнуть клапана', 'загнуло клапана', 'ремень генератора', 'ролик натяжителя',
    'помпа', 'термостат заклинил', 'тосол', 'антифриз', 'фриз', 'ож', 'охлаждайка',
    'заглушка', 'сальник', 'прокладка клапанной', 'маслосъемные',
    'тяга', 'рулевые наконечники', 'шаровая', 'сайлентблок',
    'на низах', 'на верхах', 'тянет', 'не тянет', 'троит', 'двоит',
    'масложор', 'жрет масло', 'дымит', 'сизый дым', 'белый дым',
    'стартер крутит', 'не заводится', 'схватывает', 'глохнет',
    'форсунки', 'инжектор', 'карбюратор', 'карб', 'солекс', 'озон',
    'свечи', 'катушка', 'бронепровода', 'трамблер', 'датчик коленвала'
  ],
  
  // Strong conversational markers
  conversational: [
    'врать не буду', 'чего греха таить', 'положа руку на сердце',
    'как сейчас помню', 'давным-давно', 'на авось', 'как-то раз',
    'блин', 'ёлки', 'ёлки-палки', 'ёпрст', 'чёрт', 'черт возьми',
    'короче', 'ну вот', 'слушай', 'смотри', 'знаешь'
  ],
  
  // Internet slang
  slang: [
    'кринж', 'кринжатина', 'рофл', 'треш', 'дичь', 'годнота', 'зачетно', 'на изи',
    'по фану', 'не зашло', 'от слова совсем', 'токсик', 'душнила', 'пруфы',
    'инфа сотка', 'хайп', 'чекайте', 'баян', 'жиза', 'рил', 'кэп'
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
  'собственно', 'кстати', 'между прочим', 'если честно', 'по правде говоря'
];

// Combine all markers for regex
const allHumanMarkers = [].concat(...Object.values(HUMAN_MARKER_DICTIONARY));
const humanMarkersRegex = new RegExp('(' + allHumanMarkers.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');

// Analyzes rare idioms and author style
function analyzeRareIdioms(text) {
  const textLower = text.toLowerCase();
  const matches = text.match(humanMarkersRegex) || [];
  const uniqueMatches = new Set(matches.map(m => m.toLowerCase()));
  
  let idiomCount = uniqueMatches.size;
  const foundIdioms = Array.from(uniqueMatches).slice(0, 10);
  
  // Check for multi-word phrases
  for (const idiom of allHumanMarkers) {
    if (idiom.includes(' ') && textLower.includes(idiom) && !uniqueMatches.has(idiom)) {
      idiomCount++;
      foundIdioms.push(idiom);
    }
  }
  
  // Check for ironic quotes
  const ironicQuotes = text.match(/[«"][а-яёa-z]+[»"]/gi) || [];
  const hasIronicQuotes = ironicQuotes.length >= 1;
  
  // Check for compound words (hyphenated)
  const compoundWords = text.match(/[а-яё]+-[а-яё]+/gi) || [];
  const hasCompoundWords = compoundWords.length >= 2;
  
  let humanScore = 0;
  if (idiomCount >= 5) humanScore = 0.70;
  else if (idiomCount >= 3) humanScore = 0.55;
  else if (idiomCount >= 2) humanScore = 0.40;
  else if (idiomCount >= 1) humanScore = 0.25;
  
  if (hasIronicQuotes) humanScore += 0.15;
  if (hasCompoundWords) humanScore += 0.10;
  
  return {
    humanScore: Math.min(0.75, humanScore),
    idiomCount,
    uniqueCount: uniqueMatches.size,
    foundIdioms: foundIdioms.slice(0, 5),
    hasIronicQuotes,
    hasCompoundWords
  };
}

// Analyzes lexical richness (Type-Token Ratio)
function analyzeLexicalRichness(text) {
  const words = text.toLowerCase().match(/\b[а-яёa-z]{3,}\b/g) || [];
  if (words.length < 20) return { ttr: 0.5, isRich: false, humanScore: 0 };
  
  const uniqueWords = new Set(words);
  const ttr = uniqueWords.size / words.length;
  
  const rareWords = words.filter(w => w.length >= 8);
  const rareUnique = new Set(rareWords);
  const rareRatio = words.length > 0 ? rareUnique.size / words.length : 0;
  
  let humanScore = 0;
  let isRich = false;
  
  if (ttr > 0.70) { humanScore = 0.35; isRich = true; }
  else if (ttr > 0.60) { humanScore = 0.25; isRich = true; }
  else if (ttr > 0.50) { humanScore = 0.15; }
  else if (ttr < 0.35) { humanScore = -0.15; }
  
  if (rareRatio > 0.15) humanScore += 0.10;
  
  return {
    ttr: Math.round(ttr * 100),
    uniqueWords: uniqueWords.size,
    totalWords: words.length,
    rareRatio: Math.round(rareRatio * 100),
    isRich,
    humanScore
  };
}

// Analyzes emotional markers
function analyzeEmotionalMarkers(text) {
  const textLower = text.toLowerCase();
  
  const evaluativeWords = [
    'отличн', 'ужасн', 'прекрасн', 'кошмарн', 'великолепн', 'отвратительн',
    'потрясающ', 'безобразн', 'замечательн', 'омерзительн', 'восхитительн',
    'идиот', 'дурак', 'гений', 'молодец', 'умница', 'балбес', 'тупица',
    'красота', 'ужас', 'кошмар', 'прелесть', 'гадость', 'мерзость',
    'обожаю', 'ненавижу', 'терпеть не могу', 'души не чаю',
    'amazing', 'terrible', 'wonderful', 'horrible', 'fantastic', 'disgusting'
  ];
  
  let evaluativeCount = 0;
  for (const word of evaluativeWords) {
    if (textLower.includes(word)) evaluativeCount++;
  }
  
  const exclamations = (text.match(/!/g) || []).length;
  const questions = (text.match(/\?/g) || []).length;
  const ellipsis = (text.match(/\.{3}/g) || []).length;
  const emotionalPunctuation = exclamations + questions + ellipsis;
  
  const personalPronouns = (textLower.match(/\b(я|мне|меня|мой|моя|моё|мои|по-моему|i|me|my|mine)\b/g) || []).length;
  
  let humanScore = 0;
  if (evaluativeCount >= 3) humanScore += 0.20;
  else if (evaluativeCount >= 1) humanScore += 0.10;
  
  if (emotionalPunctuation >= 5) humanScore += 0.15;
  else if (emotionalPunctuation >= 2) humanScore += 0.08;
  
  if (personalPronouns >= 5) humanScore += 0.10;
  else if (personalPronouns >= 2) humanScore += 0.05;
  
  return {
    humanScore: Math.min(0.40, humanScore),
    evaluativeCount,
    emotionalPunctuation,
    personalPronouns,
    hasEmotions: evaluativeCount > 0 || emotionalPunctuation > 2
  };
}

// Analyzes rhythmic patterns (sentence length variation)
function analyzeRhythmicChaos(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
  if (sentences.length < 4) return { score: 0.5, cv: 50, isHumanRhythm: false };
  
  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((s, l) => s + Math.pow(l - avg, 2), 0) / lengths.length;
  const std = Math.sqrt(variance);
  const cv = avg > 0 ? (std / avg) * 100 : 0;
  
  const jumps = [];
  for (let i = 1; i < lengths.length; i++) {
    jumps.push(Math.abs(lengths[i] - lengths[i-1]));
  }
  const maxJump = Math.max(...jumps);
  
  const hasExtremeVariation = lengths.some(l => l < 4) && lengths.some(l => l > 15);
  const hasBigJump = maxJump > avg * 1.5;
  
  let score = 0;
  let isHumanRhythm = false;
  
  if (cv > 60 && hasBigJump) { score = 0.15; isHumanRhythm = true; }
  else if (cv > 50 || hasExtremeVariation) { score = 0.25; isHumanRhythm = true; }
  else if (cv > 40) { score = 0.40; }
  else if (cv > 30) { score = 0.60; }
  else if (cv > 20) { score = 0.80; }
  else { score = 0.90; }
  
  return {
    score,
    cv: Math.round(cv),
    std: Math.round(std * 10) / 10,
    avg: Math.round(avg),
    maxJump,
    hasExtremeVariation,
    hasBigJump,
    isHumanRhythm
  };
}

// Analyzes information density
function analyzeInformationDensity(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  if (sentences.length < 2) return { score: 0.5, density: 50 };
  
  const specificPatterns = [
    /\d+[.,]\d+/g,
    /\d+\s*(мм|см|м|км|кг|г|л|мл|°|градус|бар|атм|psi|rpm)/gi,
    /\d+\s*(в|вольт|а|ампер|вт|ватт|квт|ом|мгц|гц)/gi,
    /\b[A-Z]{2,}[0-9]+\b/g,
    /\b\d{1,2}[.:]\d{2}\b/g,
  ];
  
  let specificCount = 0;
  for (const pattern of specificPatterns) {
    const matches = text.match(pattern);
    if (matches) specificCount += matches.length;
  }
  
  const densityPerSentence = specificCount / sentences.length;
  
  let score = 0;
  let isHighDensity = false;
  
  if (densityPerSentence > 1.5) { score = 0.20; isHighDensity = true; }
  else if (densityPerSentence > 1.0) { score = 0.30; isHighDensity = true; }
  else if (densityPerSentence > 0.5) { score = 0.45; }
  else { score = 0.55; }
  
  return {
    score,
    specificCount,
    densityPerSentence: Math.round(densityPerSentence * 100) / 100,
    isHighDensity
  };
}

// Fast marker analysis
function fastAnalyze(text) {
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
  
  return {
    strongCount,
    strongFound,
    weakCount,
    weakFound,
    hasStrong: strongCount > 0,
    hasWeak: weakCount > 0
  };
}

// Main analysis function
function analyzeText(text) {
  if (!text || text.trim().length < 30) {
    return { error: 'Text too short', localAiProb: 0, aiPhrases: [] };
  }
  
  const humanData = fastAnalyze(text);
  
  // Strong marker found - early exit
  if (humanData.strongCount >= 1) {
    const aiProb = humanData.strongCount >= 3 ? 0.05 : humanData.strongCount >= 2 ? 0.10 : 0.20;
    return {
      localAiProb: aiProb,
      humanScore: Math.round((1 - aiProb) * 100),
      aiPhrases: [`[HUMAN] ${humanData.strongFound.slice(0, 3).join(', ')}`],
      confidence: 'high',
      dictionaryMatches: humanData.strongCount,
      foundMarkers: humanData.strongFound
    };
  }
  
  // Many weak markers
  if (humanData.weakCount >= 5) {
    return {
      localAiProb: 0.25,
      humanScore: 75,
      aiPhrases: [`[MARKERS] ${humanData.weakCount} phrases`],
      confidence: 'medium',
      dictionaryMatches: humanData.weakCount,
      foundMarkers: humanData.weakFound
    };
  }
  
  // Run full analysis
  const idioms = analyzeRareIdioms(text);
  const lexical = analyzeLexicalRichness(text);
  const emotions = analyzeEmotionalMarkers(text);
  const rhythm = analyzeRhythmicChaos(text);
  const density = analyzeInformationDensity(text);
  
  // Calculate AI probability
  let aiProbability = rhythm.score * 0.35 + density.score * 0.25 + 0.40;
  
  // Reduce for human signals
  if (idioms.idiomCount >= 1) aiProbability -= 0.15;
  if (lexical.isRich) aiProbability -= 0.12;
  if (emotions.hasEmotions) aiProbability -= 0.08;
  if (rhythm.isHumanRhythm) aiProbability -= 0.10;
  if (density.isHighDensity) aiProbability -= 0.08;
  
  // Adjust for weak markers
  if (humanData.weakCount >= 3) aiProbability *= 0.85;
  else if (humanData.weakCount >= 1) aiProbability *= 0.92;
  
  aiProbability = Math.max(0.01, Math.min(0.95, aiProbability));
  
  const markers = [];
  if (idioms.idiomCount >= 1) markers.push(`${idioms.idiomCount} idioms`);
  if (lexical.isRich) markers.push(`Rich vocabulary (TTR=${lexical.ttr}%)`);
  if (emotions.hasEmotions) markers.push('Emotional markers');
  if (rhythm.isHumanRhythm) markers.push(`Variable rhythm (CV=${rhythm.cv}%)`);
  if (density.isHighDensity) markers.push('High fact density');
  if (humanData.weakCount > 0) markers.push(`${humanData.weakCount} hedging phrases`);
  
  const words = text.match(/\b[a-zа-яё]+\b/gi) || [];
  
  return {
    ttr: lexical.ttr,
    sentenceStd: rhythm.std,
    sentenceAvg: rhythm.avg,
    aiPhrases: markers,
    localAiProb: Math.round(aiProbability * 100) / 100,
    confidence: words.length > 150 ? 'high' : words.length > 80 ? 'medium' : 'low',
    wordCount: words.length,
    humanScore: Math.round((1 - aiProbability) * 100),
    dictionaryMatches: humanData.strongCount + humanData.weakCount,
    foundMarkers: [...humanData.strongFound, ...humanData.weakFound],
    hasRareIdioms: idioms.idiomCount >= 1,
    isRichVocabulary: lexical.isRich,
    hasEmotions: emotions.hasEmotions,
    isHumanRhythm: rhythm.isHumanRhythm,
    isHighDensity: density.isHighDensity
  };
}

// Export for browser
window.analyzeText = analyzeText;
window.analyzeRareIdioms = analyzeRareIdioms;
window.analyzeLexicalRichness = analyzeLexicalRichness;
window.analyzeEmotionalMarkers = analyzeEmotionalMarkers;
window.analyzeRhythmicChaos = analyzeRhythmicChaos;
window.fastAnalyze = fastAnalyze;
window.analyzeInformationDensity = analyzeInformationDensity;

if (typeof module !== 'undefined') {
  module.exports = { analyzeText, analyzeRareIdioms, analyzeLexicalRichness, analyzeEmotionalMarkers, analyzeRhythmicChaos, analyzeInformationDensity, fastAnalyze };
}
