// Main Application Logic
class TokenizerApp {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.initializeTokenizer();
    }

    initializeElements() {
        // Get DOM elements
        this.inputText = document.getElementById('inputText');
        this.encodeBtn = document.getElementById('encodeBtn');
        this.decodeBtn = document.getElementById('decodeBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.encodedResult = document.getElementById('encodedResult');
        this.decodedResult = document.getElementById('decodedResult');
        this.tokenCount = document.getElementById('tokenCount');
        this.compressionRatio = document.getElementById('compressionRatio');
        this.accuracy = document.getElementById('accuracy');
        this.totalVocab = document.getElementById('totalVocab');
        this.mergedCount = document.getElementById('mergedCount');
        this.exampleBtns = document.querySelectorAll('.example-btn');
    }

    attachEventListeners() {
        // Button events
        this.encodeBtn.addEventListener('click', () => this.encodeText());
        this.decodeBtn.addEventListener('click', () => this.decodeTokens());
        this.clearBtn.addEventListener('click', () => this.clearAll());

        // Example button events
        this.exampleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = e.target.getAttribute('data-text');
                this.inputText.value = text;
                this.encodeText();
            });
        });

        // Auto-encode on text change (with debounce)
        let timeout;
        this.inputText.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (this.inputText.value.trim()) {
                    this.encodeText();
                }
            }, 500);
        });
    }

    async initializeTokenizer() {
        try {
            this.showLoading(true);
            
            // Try to load merge rules
            const loaded = await window.tokenizer.loadMergeRules();
            
            if (loaded) {
                this.updateVocabStats();
                this.showStatus('✅ Tokenizer loaded successfully!');
                
                // Auto-encode initial text
                if (this.inputText.value.trim()) {
                    this.encodeText();
                }
            } else {
                this.showStatus('⚠️ Using fallback rules (demo mode)');
                this.updateVocabStats();
            }
        } catch (error) {
            this.showStatus('❌ Failed to initialize tokenizer');
            console.error('Tokenizer initialization error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    encodeText() {
        try {
            const text = this.inputText.value.trim();
            if (!text) {
                this.clearResults();
                return;
            }

            // Encode the text
            const encoded = window.tokenizer.encode(text);
            const decoded = window.tokenizer.decode(encoded);
            
            // Update results
            this.displayEncodedTokens(encoded);
            this.displayDecodedText(decoded, text);
            this.updateStats(text, encoded, decoded);
            
        } catch (error) {
            this.showError('Encoding failed: ' + error.message);
        }
    }

    decodeTokens() {
        try {
            const input = this.inputText.value.trim();
            if (!input) return;

            // Try to parse tokens from input
            let tokens;
            if (input.includes(',')) {
                // Comma-separated tokens
                tokens = input.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t));
            } else if (input.includes(' ')) {
                // Space-separated tokens
                tokens = input.split(' ').map(t => parseInt(t.trim())).filter(t => !isNaN(t));
            } else {
                // Handle JSON array *only* if input looks like one (starts with '[')
                if (input.trim().startsWith('[') && input.trim().endsWith(']')) {
                    try {
                        tokens = JSON.parse(input);
                    } catch {
                        throw new Error('Invalid JSON array format for tokens');
                    }
                } else {
                    // Single token
                    const token = parseInt(input);
                    if (!isNaN(token)) {
                        tokens = [token];
                    } else {
                        throw new Error('Invalid token format. Use: [1,2,3] or 1,2,3 or 1 2 3');
                    }
                }
            }

            if (!tokens || tokens.length === 0) {
                throw new Error('No valid tokens found');
            }

            // Decode tokens
            const decoded = window.tokenizer.decode(tokens);
            
            // Update results
            this.displayEncodedTokens(tokens);
            this.displayDecodedText(decoded);
            this.updateStats(decoded, tokens, decoded);

        } catch (error) {
            this.showError('Decoding failed: ' + error.message);
        }
    }

    displayEncodedTokens(tokens) {
        if (tokens.length === 0) {
            this.encodedResult.innerHTML = '<span class="placeholder">No tokens</span>';
            return;
        }

        // Format tokens with highlighting
        const formattedTokens = window.tokenizer.formatTokensForDisplay(tokens);
        this.encodedResult.innerHTML = formattedTokens;

        // Add copy functionality
        this.encodedResult.title = 'Click to copy tokens';
        this.encodedResult.style.cursor = 'pointer';
        this.encodedResult.onclick = () => {
            navigator.clipboard.writeText(JSON.stringify(tokens));
            this.showStatus('📋 Tokens copied to clipboard!');
        };
    }

    displayDecodedText(decoded, original = null) {
        if (!decoded) {
            this.decodedResult.innerHTML = '<span class="placeholder">No decoded text</span>';
            return;
        }

        const escaped = this.escapeHtml(decoded);
        // Show spaces explicitly as · so they are visible in the UI
        const visibleText = escaped.replace(/ /g, '·');
        this.decodedResult.innerHTML = `<span style="font-family: 'Courier New', monospace;">${visibleText}</span>`;
        
        // Add copy functionality
        this.decodedResult.title = 'Click to copy text';
        this.decodedResult.style.cursor = 'pointer';
        this.decodedResult.onclick = () => {
            navigator.clipboard.writeText(decoded);
            this.showStatus('📋 Text copied to clipboard!');
        };
    }

    updateStats(originalText, tokens, decoded) {
        // Token count
        this.tokenCount.textContent = `Token count: ${tokens.length}`;

        // Compression ratio
        const compression = window.tokenizer.getCompressionRatio(originalText, tokens);
        this.compressionRatio.textContent = `Compression: ${compression}%`;

        // Accuracy check
        const isAccurate = originalText === decoded;
        this.accuracy.textContent = `Perfect reconstruction: ${isAccurate ? '✅' : '❌'}`;
        this.accuracy.style.color = isAccurate ? '#48bb78' : '#e53e3e';

        // Token breakdown
        const breakdown = window.tokenizer.getTokenBreakdown(tokens);
        console.log(`Token breakdown: ${breakdown.ascii} ASCII, ${breakdown.merged} merged`);
    }

    updateVocabStats() {
        const stats = window.tokenizer.getVocabStats();
        this.totalVocab.textContent = stats.totalTokens;
        this.mergedCount.textContent = `${stats.mergedTokens} (${256}-${stats.totalTokens - 1})`;
    }

    clearAll() {
        this.inputText.value = '';
        this.clearResults();
    }

    clearResults() {
        this.encodedResult.innerHTML = '<span class="placeholder">Encoded tokens will appear here...</span>';
        this.decodedResult.innerHTML = '<span class="placeholder">Decoded text will appear here...</span>';
        this.tokenCount.textContent = 'Token count: 0';
        this.compressionRatio.textContent = 'Compression: 0%';
        this.accuracy.textContent = 'Perfect reconstruction: ✓';
        this.accuracy.style.color = '#718096';
    }

    showLoading(isLoading) {
        const elements = [this.encodeBtn, this.decodeBtn, this.clearBtn];
        elements.forEach(el => {
            if (isLoading) {
                el.classList.add('loading');
                el.disabled = true;
            } else {
                el.classList.remove('loading');
                el.disabled = false;
            }
        });
    }

    showStatus(message) {
        // Create temporary status message
        const status = document.createElement('div');
        status.textContent = message;
        status.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
            transition: opacity 0.3s;
        `;
        
        document.body.appendChild(status);
        
        // Remove after 3 seconds
        setTimeout(() => {
            status.style.opacity = '0';
            setTimeout(() => status.remove(), 300);
        }, 3000);
    }

    showError(message) {
        this.encodedResult.innerHTML = `<span style="color: #e53e3e;">❌ ${message}</span>`;
        this.decodedResult.innerHTML = `<span style="color: #e53e3e;">❌ ${message}</span>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TokenizerApp();
}); 