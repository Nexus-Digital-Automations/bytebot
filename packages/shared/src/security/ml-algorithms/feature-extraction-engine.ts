/**
 * Feature Extraction Engine for Vulnerability Pattern Detection
 *
 * Advanced feature engineering system for vulnerability text processing with TF-IDF,
 * n-grams, security-specific features, and production-ready optimization.
 *
 * @fileoverview Feature Extraction Engine - Core ML Feature Engineering
 * @version 2.0.0
 * @author ML Algorithms Team - Advanced Security Framework
 */

import { performance } from "perf_hooks";

// ===========================
// CORE TYPES AND INTERFACES
// ===========================

export interface TextFeatures {
  /** Term Frequency-Inverse Document Frequency features */
  readonly tfidf: Record<string, number>;
  /** N-gram features (unigrams, bigrams, trigrams) */
  readonly ngrams: Record<string, number>;
  /** Security-specific pattern features */
  readonly securityPatterns: Record<string, number>;
  /** Statistical text features */
  readonly textStatistics: Record<string, number>;
  /** Metadata features */
  readonly metadata: Record<string, number>;
}

export interface SecurityPatternFeatures {
  /** SQL injection patterns */
  readonly sqlInjectionFeatures: Record<string, number>;
  /** XSS pattern features */
  readonly xssFeatures: Record<string, number>;
  /** Path traversal features */
  readonly pathTraversalFeatures: Record<string, number>;
  /** Command injection features */
  readonly commandInjectionFeatures: Record<string, number>;
  /** Crypto-related features */
  readonly cryptoFeatures: Record<string, number>;
  /** Network security features */
  readonly networkFeatures: Record<string, number>;
  /** Authentication bypass features */
  readonly authBypassFeatures: Record<string, number>;
}

export interface FeatureExtractionConfig {
  /** TF-IDF configuration */
  readonly tfidf: {
    readonly maxFeatures: number;
    readonly minDocumentFreq: number;
    readonly maxDocumentFreq: number;
    readonly useSublinearTf: boolean;
    readonly smoothIdf: boolean;
  };
  /** N-gram configuration */
  readonly ngrams: {
    readonly minN: number;
    readonly maxN: number;
    readonly maxFeatures: number;
    readonly useWordNgrams: boolean;
    readonly useCharNgrams: boolean;
  };
  /** Security pattern configuration */
  readonly securityPatterns: {
    readonly enabled: boolean;
    readonly customPatterns: Record<string, RegExp>;
    readonly caseSensitive: boolean;
  };
  /** Text preprocessing */
  readonly preprocessing: {
    readonly lowercase: boolean;
    readonly removeStopwords: boolean;
    readonly stemming: boolean;
    readonly removePunctuation: boolean;
    readonly normalizeWhitespace: boolean;
  };
  /** Performance optimization */
  readonly optimization: {
    readonly batchSize: number;
    readonly parallelProcessing: boolean;
    readonly cacheFeatures: boolean;
    readonly memoryOptimization: boolean;
  };
}

export interface VocabularyInfo {
  readonly vocabulary: Record<string, number>;
  readonly idf: Record<string, number>;
  readonly documentFrequencies: Record<string, number>;
  readonly totalDocuments: number;
  readonly vocabularySize: number;
}

export interface FeatureExtractionResult {
  readonly features: TextFeatures;
  readonly processingTime: number;
  readonly featureCount: number;
  readonly densityRatio: number;
}

// ===========================
// FEATURE EXTRACTION ENGINE
// ===========================

/**
 * Feature Extraction Engine for Vulnerability Pattern Detection
 *
 * Comprehensive feature engineering system combining traditional NLP techniques
 * with security-specific pattern recognition for vulnerability classification.
 */
export class FeatureExtractionEngine {
  private readonly config: FeatureExtractionConfig;
  private readonly logger: Console;
  private vocabulary: VocabularyInfo | null = null;
  private featureCache: Map<string, TextFeatures> = new Map();
  private readonly stopwords: Set<string>;
  private readonly securityPatterns: Record<string, RegExp>;

  constructor(config?: Partial<FeatureExtractionConfig>) {
    this.config = {
      tfidf: {
        maxFeatures: 5000,
        minDocumentFreq: 2,
        maxDocumentFreq: 0.8,
        useSublinearTf: true,
        smoothIdf: true,
      },
      ngrams: {
        minN: 1,
        maxN: 3,
        maxFeatures: 3000,
        useWordNgrams: true,
        useCharNgrams: true,
      },
      securityPatterns: {
        enabled: true,
        customPatterns: {},
        caseSensitive: false,
      },
      preprocessing: {
        lowercase: true,
        removeStopwords: true,
        stemming: true,
        removePunctuation: true,
        normalizeWhitespace: true,
      },
      optimization: {
        batchSize: 100,
        parallelProcessing: true,
        cacheFeatures: true,
        memoryOptimization: true,
      },
      ...config,
    };

    this.logger = console;
    this.stopwords = this.initializeStopwords();
    this.securityPatterns = this.initializeSecurityPatterns();
  }

  /**
   * Build vocabulary from training documents
   */
  public async buildVocabulary(documents: readonly string[]): Promise<void> {
    const startTime = performance.now();
    this.logger.info(
      `Building vocabulary from ${documents.length} documents...`,
    );

    try {
      // Preprocess documents
      const preprocessedDocs = await this.preprocessDocuments(documents);

      // Calculate term frequencies
      const termFrequencies = this.calculateTermFrequencies(preprocessedDocs);

      // Filter vocabulary by document frequency
      const filteredVocab = this.filterVocabulary(
        termFrequencies,
        documents.length,
      );

      // Calculate IDF values
      const idf = this.calculateIdf(filteredVocab, documents.length);

      this.vocabulary = {
        vocabulary: filteredVocab.vocabulary,
        idf,
        documentFrequencies: filteredVocab.documentFrequencies,
        totalDocuments: documents.length,
        vocabularySize: Object.keys(filteredVocab.vocabulary).length,
      };

      const duration = performance.now() - startTime;
      this.logger.info(
        `Vocabulary built in ${duration.toFixed(2)}ms - ` +
          `${this.vocabulary.vocabularySize} features`,
      );
    } catch (error) {
      this.logger.error("Vocabulary building failed:", error);
      throw new Error(
        `Vocabulary building failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extract features from a single document
   */
  public async extractFeatures(
    document: string,
    metadata?: Record<string, unknown>,
  ): Promise<FeatureExtractionResult> {
    const startTime = performance.now();

    if (!this.vocabulary) {
      throw new Error("Vocabulary not built. Call buildVocabulary() first.");
    }

    try {
      // Check cache if enabled
      const cacheKey = this.getCacheKey(document, metadata);
      if (
        this.config.optimization.cacheFeatures &&
        this.featureCache.has(cacheKey)
      ) {
        const cachedFeatures = this.featureCache.get(cacheKey)!;
        return {
          features: cachedFeatures,
          processingTime: performance.now() - startTime,
          featureCount: this.countFeatures(cachedFeatures),
          densityRatio: this.calculateDensityRatio(cachedFeatures),
        };
      }

      // Preprocess document
      const preprocessed = this.preprocessDocument(document);

      // Extract TF-IDF features
      const tfidf = await this.extractTfIdfFeatures(preprocessed);

      // Extract N-gram features
      const ngrams = await this.extractNgramFeatures(preprocessed);

      // Extract security pattern features
      const securityPatterns = await this.extractSecurityPatterns(document);

      // Extract text statistics
      const textStatistics = this.extractTextStatistics(document, preprocessed);

      // Process metadata features
      const metadataFeatures = this.extractMetadataFeatures(metadata);

      const features: TextFeatures = {
        tfidf,
        ngrams,
        securityPatterns,
        textStatistics,
        metadata: metadataFeatures,
      };

      // Cache features if enabled
      if (this.config.optimization.cacheFeatures) {
        this.featureCache.set(cacheKey, features);
      }

      const processingTime = performance.now() - startTime;

      return {
        features,
        processingTime,
        featureCount: this.countFeatures(features),
        densityRatio: this.calculateDensityRatio(features),
      };
    } catch (error) {
      this.logger.error("Feature extraction failed:", error);
      throw new Error(
        `Feature extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extract features from multiple documents (batch processing)
   */
  public async extractBatchFeatures(
    documents: readonly string[],
    metadata?: readonly (Record<string, unknown> | undefined)[],
  ): Promise<FeatureExtractionResult[]> {
    const startTime = performance.now();

    if (!this.vocabulary) {
      throw new Error("Vocabulary not built. Call buildVocabulary() first.");
    }

    try {
      const results: FeatureExtractionResult[] = [];
      const batchSize = this.config.optimization.batchSize;

      // Process in batches for memory optimization
      for (let i = 0; i < documents.length; i += batchSize) {
        const batchDocs = documents.slice(i, i + batchSize);
        const batchMetadata = metadata?.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batchDocs.map((doc, idx) =>
            this.extractFeatures(doc, batchMetadata?.[idx]),
          ),
        );

        results.push(...batchResults);
      }

      const totalTime = performance.now() - startTime;
      this.logger.info(
        `Batch feature extraction completed: ${documents.length} documents in ${totalTime.toFixed(2)}ms`,
      );

      return results;
    } catch (error) {
      this.logger.error("Batch feature extraction failed:", error);
      throw new Error(
        `Batch feature extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get feature names for interpretability
   */
  public getFeatureNames(): {
    tfidf: string[];
    ngrams: string[];
    securityPatterns: string[];
    textStatistics: string[];
    metadata: string[];
  } {
    if (!this.vocabulary) {
      throw new Error("Vocabulary not built. Call buildVocabulary() first.");
    }

    return {
      tfidf: Object.keys(this.vocabulary.vocabulary),
      ngrams: this.getNgramFeatureNames(),
      securityPatterns: Object.keys(this.securityPatterns),
      textStatistics: [
        "doc_length",
        "word_count",
        "unique_words",
        "avg_word_length",
        "sentence_count",
        "punctuation_ratio",
        "uppercase_ratio",
        "digit_ratio",
        "special_char_ratio",
      ],
      metadata: [
        "severity_encoded",
        "category_encoded",
        "has_cve",
        "confidence_score",
      ],
    };
  }

  /**
   * Clear feature cache
   */
  public clearCache(): void {
    this.featureCache.clear();
    this.logger.info("Feature cache cleared");
  }

  /**
   * Get vocabulary statistics
   */
  public getVocabularyStats(): {
    totalFeatures: number;
    tfidfFeatures: number;
    ngramFeatures: number;
    securityFeatures: number;
    averageIdf: number;
  } | null {
    if (!this.vocabulary) {
      return null;
    }

    const idfValues = Object.values(this.vocabulary.idf);
    const averageIdf =
      idfValues.reduce((sum, idf) => sum + idf, 0) / idfValues.length;

    return {
      totalFeatures: this.vocabulary.vocabularySize,
      tfidfFeatures: this.vocabulary.vocabularySize,
      ngramFeatures: this.config.ngrams.maxFeatures,
      securityFeatures: Object.keys(this.securityPatterns).length,
      averageIdf,
    };
  }

  // ===========================
  // PRIVATE METHODS
  // ===========================

  /**
   * Initialize stopwords list
   */
  private initializeStopwords(): Set<string> {
    // Common English stopwords
    const stopwords = [
      "a",
      "an",
      "and",
      "are",
      "as",
      "at",
      "be",
      "by",
      "for",
      "from",
      "has",
      "he",
      "in",
      "is",
      "it",
      "its",
      "of",
      "on",
      "that",
      "the",
      "to",
      "was",
      "will",
      "with",
      "but",
      "or",
      "not",
      "this",
      "can",
      "could",
      "would",
      "should",
      "may",
      "might",
      "must",
      "shall",
      "do",
      "does",
      "did",
      "have",
      "had",
      "having",
      "get",
      "got",
    ];

    return new Set(stopwords);
  }

  /**
   * Initialize security-specific patterns
   */
  private initializeSecurityPatterns(): Record<string, RegExp> {
    const patterns: Record<string, RegExp> = {
      // SQL Injection patterns
      sql_select: /\bselect\b.*\bfrom\b/gi,
      sql_union: /\bunion\b.*\bselect\b/gi,
      sql_insert: /\binsert\b.*\binto\b/gi,
      sql_update: /\bupdate\b.*\bset\b/gi,
      sql_delete: /\bdelete\b.*\bfrom\b/gi,
      sql_drop: /\bdrop\b.*\btable\b/gi,
      sql_comment: /--|\*\/|\*\//g,
      sql_quotes: /'.*'|".*"/g,

      // XSS patterns
      xss_script: /<script[^>]*>.*?<\/script>/gi,
      xss_javascript: /javascript:/gi,
      xss_onerror: /onerror\s*=/gi,
      xss_onload: /onload\s*=/gi,
      xss_onclick: /onclick\s*=/gi,
      xss_img_src: /<img[^>]*src\s*=/gi,
      xss_iframe: /<iframe[^>]*>/gi,

      // Path traversal
      path_traversal: /\.\.\/|\.\.\\|\.\.\//g,
      path_absolute: /\/etc\/|\/proc\/|\/sys\//gi,
      path_windows: /c:\\|d:\\|windows\\system32/gi,

      // Command injection
      cmd_exec: /\bexec\b|\bsystem\b|\bshell_exec\b/gi,
      cmd_pipe: /\|\s*\w+/g,
      cmd_redirect: />\s*\w+|<\s*\w+/g,
      cmd_semicolon: /;\s*\w+/g,

      // Crypto/encryption
      crypto_weak: /md5|sha1|des|rc4/gi,
      crypto_password: /password|passwd|pwd/gi,
      crypto_key: /private.key|secret.key|api.key/gi,
      crypto_cert: /\.pem|\.crt|\.key$/gi,

      // Network/protocol
      network_http: /http:\/\//gi,
      network_ftp: /ftp:\/\//gi,
      network_ip: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      network_port: /:\d{1,5}\b/g,

      // Authentication bypass
      auth_bypass: /admin|root|administrator/gi,
      auth_default: /admin\/admin|root\/root|test\/test/gi,
      auth_token: /token|jwt|bearer/gi,
      auth_session: /session|cookie|auth/gi,

      // Custom patterns from config
      ...this.config.securityPatterns.customPatterns,
    };

    return patterns;
  }

  /**
   * Preprocess multiple documents
   */
  private async preprocessDocuments(
    documents: readonly string[],
  ): Promise<string[]> {
    const batchSize = this.config.optimization.batchSize;
    const results: string[] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchResults = batch.map((doc) => this.preprocessDocument(doc));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Preprocess a single document
   */
  private preprocessDocument(document: string): string {
    let text = document;

    if (this.config.preprocessing.normalizeWhitespace) {
      text = text.replace(/\s+/g, " ").trim();
    }

    if (this.config.preprocessing.lowercase) {
      text = text.toLowerCase();
    }

    if (this.config.preprocessing.removePunctuation) {
      text = text.replace(/[^\w\s]/g, " ");
    }

    if (this.config.preprocessing.removeStopwords) {
      const words = text.split(/\s+/);
      const filteredWords = words.filter((word) => !this.stopwords.has(word));
      text = filteredWords.join(" ");
    }

    if (this.config.preprocessing.stemming) {
      text = this.applyStemming(text);
    }

    return text;
  }

  /**
   * Apply simple stemming (Porter stemmer approximation)
   */
  private applyStemming(text: string): string {
    return text.replace(/\w+/g, (word) => {
      // Simple suffix removal rules
      if (word.length > 3) {
        if (word.endsWith("ing")) return word.slice(0, -3);
        if (word.endsWith("ed")) return word.slice(0, -2);
        if (word.endsWith("er")) return word.slice(0, -2);
        if (word.endsWith("est")) return word.slice(0, -3);
        if (word.endsWith("ly")) return word.slice(0, -2);
        if (word.endsWith("ion")) return word.slice(0, -3);
        if (word.endsWith("tion")) return word.slice(0, -4);
        if (word.endsWith("sion")) return word.slice(0, -4);
      }
      return word;
    });
  }

  /**
   * Calculate term frequencies across documents
   */
  private calculateTermFrequencies(documents: string[]): {
    termFreqs: Record<string, number>;
    docFreqs: Record<string, number>;
  } {
    const termFreqs: Record<string, number> = {};
    const docFreqs: Record<string, number> = {};

    for (const doc of documents) {
      const words = doc.split(/\s+/).filter((word) => word.length > 0);
      const uniqueWords = new Set(words);

      for (const word of words) {
        termFreqs[word] = (termFreqs[word] || 0) + 1;
      }

      for (const word of Array.from(uniqueWords)) {
        docFreqs[word] = (docFreqs[word] || 0) + 1;
      }
    }

    return { termFreqs, docFreqs };
  }

  /**
   * Filter vocabulary by document frequency constraints
   */
  private filterVocabulary(
    termFrequencies: {
      termFreqs: Record<string, number>;
      docFreqs: Record<string, number>;
    },
    totalDocs: number,
  ): {
    vocabulary: Record<string, number>;
    documentFrequencies: Record<string, number>;
  } {
    const { termFreqs, docFreqs } = termFrequencies;
    const minDf = Math.max(this.config.tfidf.minDocumentFreq, 1);
    const maxDf = this.config.tfidf.maxDocumentFreq * totalDocs;

    // Filter by document frequency
    const filteredTerms = Object.keys(docFreqs).filter((term) => {
      const df = docFreqs[term];
      return df >= minDf && df <= maxDf;
    });

    // Sort by term frequency and take top features
    const sortedTerms = filteredTerms
      .sort((a, b) => termFreqs[b] - termFreqs[a])
      .slice(0, this.config.tfidf.maxFeatures);

    // Create vocabulary mapping
    const vocabulary: Record<string, number> = {};
    const documentFrequencies: Record<string, number> = {};

    sortedTerms.forEach((term, index) => {
      vocabulary[term] = index;
      documentFrequencies[term] = docFreqs[term];
    });

    return { vocabulary, documentFrequencies };
  }

  /**
   * Calculate IDF (Inverse Document Frequency) values
   */
  private calculateIdf(
    vocabInfo: {
      vocabulary: Record<string, number>;
      documentFrequencies: Record<string, number>;
    },
    totalDocs: number,
  ): Record<string, number> {
    const idf: Record<string, number> = {};

    for (const [term, df] of Object.entries(vocabInfo.documentFrequencies)) {
      if (this.config.tfidf.smoothIdf) {
        idf[term] = Math.log((totalDocs + 1) / (df + 1)) + 1;
      } else {
        idf[term] = Math.log(totalDocs / df) + 1;
      }
    }

    return idf;
  }

  /**
   * Extract TF-IDF features
   */
  private async extractTfIdfFeatures(
    preprocessedDoc: string,
  ): Promise<Record<string, number>> {
    if (!this.vocabulary) {
      throw new Error("Vocabulary not initialized");
    }

    const words = preprocessedDoc
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const termCounts: Record<string, number> = {};

    // Count term frequencies
    for (const word of words) {
      if (word in this.vocabulary.vocabulary) {
        termCounts[word] = (termCounts[word] || 0) + 1;
      }
    }

    const tfidf: Record<string, number> = {};
    const totalWords = words.length;

    for (const [term, count] of Object.entries(termCounts)) {
      // Calculate TF
      let tf = count / totalWords;

      if (this.config.tfidf.useSublinearTf) {
        tf = 1 + Math.log(tf);
      }

      // Calculate TF-IDF
      const idfValue = this.vocabulary.idf[term] || 0;
      tfidf[`tfidf_${term}`] = tf * idfValue;
    }

    return tfidf;
  }

  /**
   * Extract N-gram features
   */
  private async extractNgramFeatures(
    preprocessedDoc: string,
  ): Promise<Record<string, number>> {
    const ngrams: Record<string, number> = {};
    const words = preprocessedDoc
      .split(/\s+/)
      .filter((word) => word.length > 0);

    // Word N-grams
    if (this.config.ngrams.useWordNgrams) {
      for (let n = this.config.ngrams.minN; n <= this.config.ngrams.maxN; n++) {
        for (let i = 0; i <= words.length - n; i++) {
          const ngramKey = `word_ngram_${n}_${words.slice(i, i + n).join("_")}`;
          ngrams[ngramKey] = (ngrams[ngramKey] || 0) + 1;
        }
      }
    }

    // Character N-grams
    if (this.config.ngrams.useCharNgrams) {
      const text = preprocessedDoc.replace(/\s+/g, "");
      for (
        let n = this.config.ngrams.minN;
        n <= Math.min(this.config.ngrams.maxN, 5);
        n++
      ) {
        for (let i = 0; i <= text.length - n; i++) {
          const ngramKey = `char_ngram_${n}_${text.slice(i, i + n)}`;
          ngrams[ngramKey] = (ngrams[ngramKey] || 0) + 1;
        }
      }
    }

    // Limit to max features and normalize
    const sortedNgrams = Object.entries(ngrams)
      .sort(([, a], [, b]) => b - a)
      .slice(0, this.config.ngrams.maxFeatures);

    const result: Record<string, number> = {};
    const totalNgrams = Object.values(ngrams).reduce(
      (sum, count) => sum + count,
      0,
    );

    for (const [ngram, count] of sortedNgrams) {
      result[ngram] = count / totalNgrams; // Normalize by total count
    }

    return result;
  }

  /**
   * Extract security pattern features
   */
  private async extractSecurityPatterns(
    document: string,
  ): Promise<Record<string, number>> {
    if (!this.config.securityPatterns.enabled) {
      return {};
    }

    const patterns: Record<string, number> = {};
    const text = this.config.securityPatterns.caseSensitive
      ? document
      : document.toLowerCase();

    for (const [patternName, pattern] of Object.entries(
      this.securityPatterns,
    )) {
      const matches = text.match(pattern);
      patterns[`security_${patternName}`] = matches ? matches.length : 0;
    }

    return patterns;
  }

  /**
   * Extract text statistics
   */
  private extractTextStatistics(
    originalDoc: string,
    preprocessedDoc: string,
  ): Record<string, number> {
    const words = preprocessedDoc
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const sentences = originalDoc
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);

    const docLength = originalDoc.length;
    const wordCount = words.length;
    const uniqueWords = new Set(words).size;
    const avgWordLength =
      words.reduce((sum, word) => sum + word.length, 0) / wordCount;

    const punctuationCount = (originalDoc.match(/[^\w\s]/g) || []).length;
    const uppercaseCount = (originalDoc.match(/[A-Z]/g) || []).length;
    const digitCount = (originalDoc.match(/\d/g) || []).length;
    const specialCharCount = (originalDoc.match(/[^a-zA-Z0-9\s]/g) || [])
      .length;

    return {
      doc_length: docLength,
      word_count: wordCount,
      unique_words: uniqueWords,
      avg_word_length: avgWordLength || 0,
      sentence_count: sentences.length,
      punctuation_ratio: punctuationCount / docLength,
      uppercase_ratio: uppercaseCount / docLength,
      digit_ratio: digitCount / docLength,
      special_char_ratio: specialCharCount / docLength,
    };
  }

  /**
   * Extract metadata features
   */
  private extractMetadataFeatures(
    metadata?: Record<string, unknown>,
  ): Record<string, number> {
    if (!metadata) {
      return {};
    }

    const features: Record<string, number> = {};

    // Encode severity if present
    if (metadata.severity) {
      const severityEncoding: Record<string, number> = {
        info: 0,
        low: 1,
        medium: 2,
        high: 3,
        critical: 4,
      };
      const severityKey =
        typeof metadata.severity === "string"
          ? metadata.severity.toLowerCase()
          : "unknown";
      features.severity_encoded = severityEncoding[severityKey] || 0;
    }

    // Encode category if present
    if (metadata.category) {
      const categoryEncoding: Record<string, number> = {
        owasp_top_10: 0,
        configuration: 1,
        dependency: 2,
        code_quality: 3,
        network: 4,
        container: 5,
      };
      const categoryKey =
        typeof metadata.category === "string" ? metadata.category : "unknown";
      features.category_encoded = categoryEncoding[categoryKey] || 0;
    }

    // Boolean features
    features.has_cve = metadata.cve ? 1 : 0;
    features.confidence_score =
      typeof metadata.confidence === "number" ? metadata.confidence : 0;

    return features;
  }

  /**
   * Get N-gram feature names
   */
  private getNgramFeatureNames(): string[] {
    // This would normally be built during vocabulary creation
    // For now, return placeholder names
    const names: string[] = [];

    for (let n = this.config.ngrams.minN; n <= this.config.ngrams.maxN; n++) {
      for (let i = 0; i < Math.min(100, this.config.ngrams.maxFeatures); i++) {
        if (this.config.ngrams.useWordNgrams) {
          names.push(`word_ngram_${n}_${i}`);
        }
        if (this.config.ngrams.useCharNgrams && n <= 5) {
          names.push(`char_ngram_${n}_${i}`);
        }
      }
    }

    return names;
  }

  /**
   * Generate cache key for feature caching
   */
  private getCacheKey(
    document: string,
    metadata?: Record<string, unknown>,
  ): string {
    const docHash = this.simpleHash(document);
    const metaHash = metadata
      ? this.simpleHash(JSON.stringify(metadata))
      : "no_meta";
    return `${docHash}_${metaHash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Count total number of features
   */
  private countFeatures(features: TextFeatures): number {
    return (
      Object.keys(features.tfidf).length +
      Object.keys(features.ngrams).length +
      Object.keys(features.securityPatterns).length +
      Object.keys(features.textStatistics).length +
      Object.keys(features.metadata).length
    );
  }

  /**
   * Calculate feature density ratio (non-zero features / total features)
   */
  private calculateDensityRatio(features: TextFeatures): number {
    const allFeatures = {
      ...features.tfidf,
      ...features.ngrams,
      ...features.securityPatterns,
      ...features.textStatistics,
      ...features.metadata,
    };

    const totalFeatures = Object.keys(allFeatures).length;
    const nonZeroFeatures = Object.values(allFeatures).filter(
      (value) => value !== 0,
    ).length;

    return totalFeatures > 0 ? nonZeroFeatures / totalFeatures : 0;
  }
}

/**
 * Export default instance with optimized configuration
 */
export const defaultFeatureExtractionEngine = new FeatureExtractionEngine({
  tfidf: {
    maxFeatures: 8000,
    minDocumentFreq: 3,
    maxDocumentFreq: 0.85,
    useSublinearTf: true,
    smoothIdf: true,
  },
  ngrams: {
    minN: 1,
    maxN: 3,
    maxFeatures: 4000,
    useWordNgrams: true,
    useCharNgrams: true,
  },
  securityPatterns: {
    enabled: true,
    customPatterns: {},
    caseSensitive: false,
  },
  preprocessing: {
    lowercase: true,
    removeStopwords: true,
    stemming: true,
    removePunctuation: true,
    normalizeWhitespace: true,
  },
  optimization: {
    batchSize: 150,
    parallelProcessing: true,
    cacheFeatures: true,
    memoryOptimization: true,
  },
});

/**
 * Export types and main class
 */
export { FeatureExtractionEngine as default };
