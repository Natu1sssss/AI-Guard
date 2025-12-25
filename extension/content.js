/**
 * AIGard Content Script - Shows overlay on page with i18n
 */

let overlay = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'show') {
    showOverlay(msg.type, msg.data);
  }
  sendResponse({ ok: true });
});

function showOverlay(type, data) {
  removeOverlay();
  
  overlay = document.createElement('div');
  overlay.id = 'aigard-overlay';
  
  if (type === 'loading') {
    overlay.innerHTML = `
      <div class="aigard-box aigard-loading">
        <div class="aigard-spinner"></div>
        <span>${data}</span>
      </div>
    `;
  } else if (type === 'error') {
    overlay.innerHTML = `
      <div class="aigard-box aigard-error">
        <span>⚠️ ${data}</span>
        <button class="aigard-close">×</button>
      </div>
    `;
    setTimeout(removeOverlay, 5000);
  } else if (type === 'result') {
    const r = data;
    const cls = r.label.toLowerCase();
    const labels = r.labels || {};
    
    // Build extended metrics HTML if available
    let extMetricsHtml = '';
    if (r.extendedMetrics) {
      const ext = r.extendedMetrics;
      extMetricsHtml = `
        <div class="aigard-ext-metrics">
          <div class="aigard-ext-title">Advanced Analysis</div>
          <div><span>Burstiness</span><span>${ext.burstiness}</span></div>
          <div><span>Zipf Deviation</span><span>${ext.zipfDeviation}</span></div>
          <div><span>Entropy</span><span>${ext.entropyNormalized}</span></div>
          <div><span>Syntax Monotony</span><span>${ext.syntaxMonotony}</span></div>
          <div><span>Repetition</span><span>${ext.repetition}</span></div>
        </div>
      `;
    }
    
    overlay.innerHTML = `
      <div class="aigard-box aigard-result">
        <div class="aigard-header">
          <span>🛡️ AIGard</span>
          <button class="aigard-close">×</button>
        </div>
        <div class="aigard-score-wrap">
          <div class="aigard-score ${cls}">${r.aiScore}</div>
          <div class="aigard-score-text">${labels.aiScore || 'AI Score'}</div>
          <div class="aigard-label ${cls}">${labels.labelText || r.label}</div>
        </div>
        <div class="aigard-metrics">
          <div><span>${labels.lexical || 'Lexical Diversity'}</span><span>${r.metrics.lexical}%</span></div>
          <div><span>${labels.variation || 'Sentence Variation'}</span><span>${r.metrics.variation}</span></div>
          <div><span>${labels.confidence || 'Confidence'}</span><span>${(r.confidence * 100).toFixed(0)}%</span></div>
          ${r.chunks > 1 ? `<div><span>${labels.chunks || 'Chunks'}</span><span>${r.chunks}</span></div>` : ''}
        </div>
        ${extMetricsHtml}
        <div class="aigard-explain">${r.explanation}</div>
        ${r.phrases.length ? `
          <div class="aigard-phrases">
            <small>${labels.suspicious || 'Suspicious:'}</small>
            ${r.phrases.map(p => `<span class="aigard-phrase">${p}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Inline styles
  const style = document.createElement('style');
  style.textContent = `
    #aigard-overlay {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    }
    .aigard-box {
      background: #1a1a2e;
      border: 1px solid #333;
      border-radius: 12px;
      color: #eee;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .aigard-loading {
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .aigard-spinner {
      width: 20px;
      height: 20px;
      border: 3px solid #333;
      border-top-color: #00d4ff;
      border-radius: 50%;
      animation: aigard-spin 0.8s linear infinite;
    }
    @keyframes aigard-spin { to { transform: rotate(360deg); } }
    .aigard-error {
      padding: 12px 16px;
      border-color: #ff4444;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #ff6666;
    }
    .aigard-result { width: 300px; }
    .aigard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: #252540;
      border-bottom: 1px solid #333;
      font-weight: 600;
      color: #00d4ff;
    }
    .aigard-close {
      background: none;
      border: none;
      color: #888;
      font-size: 22px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .aigard-close:hover { color: #fff; }
    .aigard-score-wrap { text-align: center; padding: 16px; }
    .aigard-score { font-size: 48px; font-weight: 700; line-height: 1; }
    .aigard-score.human { color: #00ff88; }
    .aigard-score.mixed { color: #ffaa00; }
    .aigard-score.ai { color: #ff4444; }
    .aigard-score-text { color: #888; font-size: 12px; margin-top: 4px; }
    .aigard-label {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .aigard-label.human { background: rgba(0,255,136,0.2); color: #00ff88; }
    .aigard-label.mixed { background: rgba(255,170,0,0.2); color: #ffaa00; }
    .aigard-label.ai { background: rgba(255,68,68,0.2); color: #ff4444; }
    .aigard-metrics { padding: 0 14px 14px; }
    .aigard-metrics > div {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 4px 0;
      border-bottom: 1px solid #333;
    }
    .aigard-metrics > div > span:first-child { color: #888; }
    .aigard-explain {
      padding: 10px 14px;
      background: #252540;
      font-size: 12px;
      color: #aaa;
      line-height: 1.4;
    }
    .aigard-phrases { padding: 10px 14px; border-top: 1px solid #333; }
    .aigard-phrases small { display: block; color: #888; font-size: 11px; margin-bottom: 6px; }
    .aigard-phrase {
      display: inline-block;
      padding: 2px 6px;
      background: rgba(255,68,68,0.15);
      border-radius: 4px;
      font-size: 11px;
      color: #ff6666;
      margin: 2px;
    }
    .aigard-ext-metrics {
      padding: 10px 14px;
      background: #1e1e35;
      border-top: 1px solid #333;
    }
    .aigard-ext-title {
      font-size: 11px;
      color: #00d4ff;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .aigard-ext-metrics > div {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 3px 0;
      color: #999;
    }
    .aigard-ext-metrics > div > span:last-child {
      color: #ccc;
      font-family: monospace;
    }
  `;
  
  document.body.appendChild(style);
  document.body.appendChild(overlay);
  
  const closeBtn = overlay.querySelector('.aigard-close');
  if (closeBtn) closeBtn.addEventListener('click', removeOverlay);
}

function removeOverlay() {
  if (overlay) { overlay.remove(); overlay = null; }
  const old = document.getElementById('aigard-overlay');
  if (old) old.remove();
}
