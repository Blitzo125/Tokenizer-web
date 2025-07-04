// BPE Tokenizer JavaScript Implementation
// ---------------------------------------------------------------------------
// Performance optimisations:
// 1. Re-use a single TextEncoder/TextDecoder instead of re-creating them.
// 2. Build quick lookup maps (pair→new_token and new_token→pair) once after
//    loading the merge rules.dqdThis avoids O(N) searches in decode and allows
//    micro-optimisations elsewhere without changing the algorithm.
// 3. Minor micro-optimisations in helper methods to cut down extra allocations.
// ---------------------------------------------------------------------------

// ⚡ Global encoder/decoder (re-used everywhere)
const _encoder = new TextEncoder();
const _decoder = new TextDecoder();

class BPETokenizer {
    constructor() {
        this.mergeRules = [];
        this.startTokenIdx = 256;
        this.isLoaded = false;

        // Lookup maps – populated after rules are loaded
        this.pairToToken = new Map();   // "97,116"  -> 265
        this.tokenToPair = new Map();   // 265        -> [97,116]
    }

    // Load pre-trained merge rules
    async loadMergeRules(rulesUrl = 'merge_rules.json') {
        try {
            const response = await fetch(rulesUrl);
            if (!response.ok) {
                throw new Error(`Failed to load merge rules: ${response.status}`);
            }
            this.mergeRules = await response.json();
            this._buildLookupMaps();
            this.isLoaded = true;
            console.log(`Loaded ${this.mergeRules.length} merge rules`);
            return true;
        } catch (error) {
            console.error('Error loading merge rules:', error);
            // Fallback: create minimal rules for demo
            this.createFallbackRules();
            return false;
        }
    }

    // Create minimal fallback rules if loading fails
    createFallbackRules() {
        this.mergeRules = [
            { pair: [104, 101], new_token: 256, count: 50 }, // "he"
            { pair: [116, 104], new_token: 257, count: 45 }, // "th" 
            { pair: [105, 110], new_token: 258, count: 40 }, // "in"
            { pair: [101, 114], new_token: 259, count: 35 }, // "er"
            { pair: [32, 116], new_token: 260, count: 30 },  // " t"
            { pair: [111, 110], new_token: 261, count: 25 }, // "on"
            { pair: [97, 110], new_token: 262, count: 20 },  // "an"
        ];
        this.isLoaded = true;
        this._buildLookupMaps();
        console.log('Using fallback merge rules');
    }

    // Convert text to tokens (UTF-8 bytes)
    textToTokens(text) {
        // Note: _encoder is reused → fewer garbage collections
        return Array.from(_encoder.encode(text));
    }

    // Find consecutive token pairs
    findTokenPairs(tokens) {
        const pairs = [];
        for (let i = 0; i < tokens.length - 1; i++) {
            pairs.push([tokens[i], tokens[i + 1]]);
        }
        return pairs;
    }

    // Merge function - replace pairs with new tokens
    merge(tokens, pair, newToken) {
        const result = [];
        let i = 0;
        
        while (i < tokens.length) {
            if (i < tokens.length - 1 && 
                tokens[i] === pair[0] && 
                tokens[i + 1] === pair[1]) {
                result.push(newToken);
                i += 2;
            } else {
                result.push(tokens[i]);
                i += 1;
            }
        }
        return result;
    }

    // Encode text using merge rules
    encode(text) {
        if (!this.isLoaded) {
            throw new Error('Tokenizer not loaded. Call loadMergeRules() first.');
        }

        let tokens = this.textToTokens(text);
        
        // Apply all merge rules in order
        for (const rule of this.mergeRules) {
            tokens = this.merge(tokens, rule.pair, rule.new_token);
        }
        
        return tokens;
    }

    // Decode tokens back to text
    decode(tokens) {
        if (!this.isLoaded) {
            throw new Error('Tokenizer not loaded. Call loadMergeRules() first.');
        }

        let currentTokens = [...tokens];
        
        // Apply merge rules in reverse order
        for (const rule of this.mergeRules.slice().reverse()) {
            const newTokens = [];
            let i = 0;
            
            while (i < currentTokens.length) {
                if (currentTokens[i] === rule.new_token) {
                    newTokens.push(...rule.pair);
                } else {
                    newTokens.push(currentTokens[i]);
                }
                i++;
            }
            currentTokens = newTokens;
        }
        
        // -------------------------------------------------------------
        // NEW LOGIC: graceful handling of custom / unknown tokens
        // -------------------------------------------------------------
        // If every token is a valid byte we can use the fast TextDecoder path
        if (currentTokens.every(t => t < 256)) {
            return _decoder.decode(new Uint8Array(currentTokens));
        }

        // Otherwise, recursively translate each token into characters.
        const decodeSingle = (tok) => {
            // ASCII byte → direct char
            if (tok < 256) {
                return String.fromCharCode(tok);
            }
            // Known merged token → expand recursively
            const pair = this.tokenToPair.get(tok);
            if (pair) {
                return decodeSingle(pair[0]) + decodeSingle(pair[1]);
            }
            // Completely unknown custom token → try treating it as a Unicode code point
            try {
                return String.fromCharCode(tok);
            } catch (err) {
                // Fallback placeholder so user still sees something meaningful
                return `[${tok}]`;
            }
        };

        return currentTokens.map(decodeSingle).join('');
    }

    // Get vocabulary statistics
    getVocabStats() {
        return {
            totalTokens: this.startTokenIdx + this.mergeRules.length,
            asciiTokens: this.startTokenIdx,
            mergedTokens: this.mergeRules.length,
            mergeRules: this.mergeRules.length
        };
    }

    // Check if token is a merged token or ASCII
    isTokenMerged(token) {
        return token >= this.startTokenIdx;
    }

    // Get compression ratio
    getCompressionRatio(originalText, encodedTokens) {
        // Avoid allocating full token array just for length
        const originalLength = _encoder.encode(originalText).length;
        const encodedLength = encodedTokens.length;
        return ((originalLength - encodedLength) / originalLength * 100).toFixed(1);
    }

    // Format tokens for display with highlighting
    formatTokensForDisplay(tokens) {
        return tokens.map(token => {
            const ismerged = this.isTokenMerged(token);
            const className = ismerged ? 'token merged' : 'token ascii';
            return `<span class="${className}" title="Token: ${token}">${token}</span>`;
        }).join(' ');
    }

    // Get human-readable token breakdown
    getTokenBreakdown(tokens) {
        const breakdown = {
            ascii: tokens.filter(t => !this.isTokenMerged(t)).length,
            merged: tokens.filter(t => this.isTokenMerged(t)).length
        };
        return breakdown;
    }

    /* --------------------------------------------------------------------- */
    /* Internal helpers                                                     */
    /* --------------------------------------------------------------------- */
    _buildLookupMaps() {
        this.pairToToken.clear();
        this.tokenToPair.clear();

        for (const rule of this.mergeRules) {
            this.pairToToken.set(rule.pair.join(','), rule.new_token);
            this.tokenToPair.set(rule.new_token, rule.pair);
        }
    }
}

// Create global tokenizer instance
window.tokenizer = new BPETokenizer(); 