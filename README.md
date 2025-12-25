# AIGard

AI-generated content detection system using hybrid analysis combining local heuristics and Mistral AI.

## Overview

AIGard helps identify AI-generated content through transparent analysis. Unlike black-box detectors, it shows exactly why text is flagged with specific metrics and reasoning.

## Features

### Local Analysis (No API Required)
- **Human Marker Detection**: Identifies idioms, slang, and technical jargon rarely used by AI
- **Lexical Richness**: Type-Token Ratio analysis for vocabulary diversity
- **Rhythmic Patterns**: Sentence length variation (AI tends to be uniform)
- **Information Density**: Specific facts vs. generic content
- **Emotional Markers**: Subjective evaluations and personal expressions

### Two-Tier Marker System
- **Strong Markers**: Definitive human indicators (slang, idioms, technical terms)
- **Weak Markers**: Hedging phrases that AI also uses (requires multiple occurrences)

### Mistral AI Integration
- Enhanced classification with LLM analysis
- Confidence scoring and reasoning
- Suspicious phrase extraction

## Installation

### Chrome Extension

1. Download the `extension` folder
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `extension` folder

### API Configuration

1. Get an API key from [console.mistral.ai](https://console.mistral.ai)
2. Open the extension popup
3. Enter your API key in settings

## Usage

1. Select text on any webpage
2. Right-click → "AIGard: Analyze Text"
3. View results in the overlay

## Detection Metrics

| Metric | Description |
|--------|-------------|
| Perfection Score | Flawless text indicates AI |
| Burstiness | Sentence complexity variation |
| Semantic Drift | Topic continuity analysis |
| Connectors | Template phrase detection |
| Perplexity | Text predictability |

## Project Structure

```
aigard/
├── extension/
│   ├── manifest.json
│   ├── background.js      # Main detection logic
│   ├── analyzer.js        # Local heuristic analysis
│   ├── content.js         # Page overlay
│   ├── popup.html/js      # Settings UI
│   └── _locales/          # Internationalization
└── backend/               # Optional FastAPI server
```

## Limitations

- Short texts (< 50 characters) are not analyzed
- Optimized for Russian and English
- Full accuracy requires Mistral API

## Disclaimer

AI detection is inherently imperfect. Results should inform, not replace, human judgment.

## License

MIT
