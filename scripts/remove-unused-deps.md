# Unused Dependencies Removal

## Dependencies to Remove (Not Found in Codebase)

### Heavy Packages (High Impact)
1. **@tremor/react** (4.0.0-beta) - ~2MB - Duplicate of recharts, not used
2. **d3** (7.9.0) - ~500KB - Full D3 library, not directly used (recharts has its own)
3. **tesseract.js** (6.0.1) - ~2MB - OCR library, not imported anywhere
4. **youtube-transcript** (1.2.1) - Not used

### Medium Impact
5. **@chatscope/chat-ui-kit-react** (2.0.3) - ~300KB - Chat UI not used
6. **rss-parser** (3.13.0) - RSS parsing not used
7. **@types/react-beautiful-dnd** (13.1.8) - Type def for unused package

### Total Estimated Savings
**~5-6MB** from production bundle

## Commands to Run

```bash
npm uninstall @tremor/react d3 tesseract.js youtube-transcript @chatscope/chat-ui-kit-react rss-parser @types/react-beautiful-dnd
```

## Notes
- recharts includes necessary D3 functionality internally
- If D3 is needed later, install specific packages: `d3-scale`, `d3-shape`, etc.
- tesseract.js can be added back if OCR feature is needed (use dynamic import)


