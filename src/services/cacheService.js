import { createClient } from 'redis';
import crypto from 'crypto';

class CacheService {

    // called only once if class instance is ccreated
    constructor() {
      this.client = null;
      this.isConnected = false;
      
      // Stop words to remove for normalization
      this.stopWords = new Set([
        'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 
        'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 
        'with', 'what', 'when', 'where', 'why', 'how', 'can', 'could', 'would', 
        'should', 'may', 'might', 'must', 'shall', 'do', 'does', 'did', 'have', 
        'had', 'has', 'am', 'been', 'being', 'this', 'these', 'those', 'i', 'you', 
        'your', 'yours', 'me', 'my', 'myself', 'we', 'our', 'ours', 'us', 'they', 
        'them', 'their', 'theirs', 'him', 'his', 'her', 'hers', 'she', 'it', 'its'
      ]);
    }

    async connect() {
      try {
        this.client = createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        this.client.on('error', (err) => {
          console.error('Redis Client Error:', err);
          this.isConnected = false;
        });

        this.client.on('connect', () => {
          console.log('✅ Redis connected successfully');
          this.isConnected = true;
        });

        await this.client.connect();
      } catch (error) {
        console.error('❌ Redis connection failed:', error);
        this.isConnected = false;
      }
    }

    async disconnect() {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
      }
    }

    // Normalize prompt for fuzzy matching
    normalizePrompt(prompt) {
      if (!prompt) return '';
      
      return prompt
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/) // Split by whitespace
        .filter(word => word.length > 0 && !this.stopWords.has(word)) // Remove stop words
        .sort() // Sort alphabetically
        .join(' ') // Join back
        .trim();
    }

    // Generate hash for resume data
    generateResumeHash(resume) {
      if (!resume) return null;
      const resumeString = JSON.stringify(resume);
      return crypto.createHash('sha256').update(resumeString).digest('hex');
    }

    // Generate conversation hash with normalization
    generateConversationHash(userId, conversationId, message) {
      const normalizedMessage = this.normalizePrompt(message);
      const data = `${userId}_${conversationId}_${normalizedMessage}`;
      return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Generate multiple hash variations for better matching
    // meaning if you say "update the resume" and "update the given resume" will give cached results 
    generateConversationHashVariations(userId, conversationId, message) {
      const hashes = [];
      
      // Original message hash
      hashes.push({
        type: 'exact',
        hash: crypto.createHash('sha256').update(`${userId}_${conversationId}_${message}`).digest('hex')
      });
      
      // Normalized message hash
      const normalizedMessage = this.normalizePrompt(message);
      hashes.push({
        type: 'normalized',
        hash: crypto.createHash('sha256').update(`${userId}_${conversationId}_${normalizedMessage}`).digest('hex')
      });
      
      // Keywords-only hash (first 3 words)
      const keywords = normalizedMessage.split(' ').slice(0, 3).join(' ');
      if (keywords) {
        hashes.push({
          type: 'keywords',
          hash: crypto.createHash('sha256').update(`${userId}_${conversationId}_${keywords}`).digest('hex')
        });
      }
      
      return hashes;
    }

    // Cache AI response with TTL
    async cacheAIResponse(key, data, ttl = 3600) {
      if (!this.isConnected || !this.client) return false;
      
      try {
        await this.client.set(key, JSON.stringify(data), 'EX', ttl);
        console.log(`📦 Cached AI response: ${key}`);
        return true;
      } catch (error) {
        console.error('Cache set error:', error);
        return false;
      }
    }

    // Get cached AI response
    // this is actually not directly used but inside the fucntion 
    async getCachedResponse(key) {
      if (!this.isConnected || !this.client) return null;
      
      try {
        const cached = await this.client.get(key);
        if (cached) {
          console.log(`📦 Cache hit: ${key}`);
          return JSON.parse(cached);
        }
        return null;
      } catch (error) {
        console.error('Cache get error:', error);
        return null;
      }
    }

    // Cache conversation history
    async cacheConversationHistory(userId, conversationId, history, ttl = 1800) {
      const key = `conv:${userId}:${conversationId}`;
      return await this.cacheAIResponse(key, history, ttl);
    }

    // Get cached conversation history
    async getCachedConversationHistory(userId, conversationId) {
      const key = `conv:${userId}:${conversationId}`;
      return await this.getCachedResponse(key);
    }

    // Cache enhanced resume
    async cacheEnhancedResume(resumeHash, enhancedData, ttl = 7200) {
      const key = `enhance:${resumeHash}`;
      return await this.cacheAIResponse(key, enhancedData, ttl);
    }

    // Get cached enhanced resume
    async getCachedEnhancedResume(resumeHash) {
      const key = `enhance:${resumeHash}`;
      return await this.getCachedResponse(key);
    }

    // Cache AI chat response with multiple variations
    async cacheChatResponse(conversationHash, response, ttl = 1800) {
      const key = `chat:${conversationHash}`;
      return await this.cacheAIResponse(key, response, ttl);
    }

    // Get cached chat response with fuzzy matching
    async getCachedChatResponse(userId, conversationId, message) {
      if (!this.isConnected || !this.client) return null;
      
      const hashVariations = this.generateConversationHashVariations(userId, conversationId, message);
      
      // Try exact match first
      for (const hashData of hashVariations) {
        const key = `chat:${hashData.hash}`;
        const cached = await this.getCachedResponse(key);
        if (cached) {
          console.log(`📦 Cache hit (${hashData.type}): ${key}`);
          return {
            ...cached,
            matchType: hashData.type
          };
        }
      }
      
      return null;
    }

    // Cache chat response with all variations
    async cacheChatResponseWithVariations(userId, conversationId, message, response, ttl = 1800) {
      const hashVariations = this.generateConversationHashVariations(userId, conversationId, message);
      
      // Cache with all variations for better matching
      const cachePromises = hashVariations.map(hashData => {
        const key = `chat:${hashData.hash}`;
        return this.cacheAIResponse(key, response, ttl);
      });
      
      await Promise.all(cachePromises);
      console.log(`📦 Cached chat response with ${hashVariations.length} variations`);
    }

    // Get cache statistics
    async getCacheStats() {
      if (!this.isConnected || !this.client) return null;
      
      try {
        const info = await this.client.info('memory');
        const keys = await this.client.dbSize();
        return { info, keys };
      } catch (error) {
        console.error('Cache stats error:', error);
        return null;
      }
    }

    // Clear specific cache patterns
    async clearCachePattern(pattern) {
      if (!this.isConnected || !this.client) return false;
      
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
          console.log(`🗑️ Cleared ${keys.length} cache entries: ${pattern}`);
        }
        return true;
      } catch (error) {
        console.error('Cache clear error:', error);
        return false;
      }
    }

    // Clear all cache
    async clearAllCache() {
      if (!this.isConnected || !this.client) return false;
      
      try {
        await this.client.flushDb();
        console.log('🗑️ Cleared all cache');
        return true;
      } catch (error) {
        console.error('Cache clear all error:', error);
        return false;
      }
    }

    // Test prompt normalization
    testNormalization(prompt) {
      const normalized = this.normalizePrompt(prompt);
      const hashVariations = this.generateConversationHashVariations('test', 'test', prompt);
      
      return {
        original: prompt,
        normalized,
        hashVariations: hashVariations.map(h => ({
          type: h.type,
          hash: h.hash.substring(0, 8) + '...'
        }))
      };
    }
}

// Singleton instance
const cacheService = new CacheService();

export default cacheService; 