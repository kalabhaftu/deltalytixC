/**
 * Data Serialization Utilities
 * Handles serialization and deserialization of various data types
 * including trading models, user preferences, and large datasets
 */

export interface SerializationOptions {
  compress?: boolean
  encrypt?: boolean
  version?: string
  timestamp?: boolean
}

export interface SerializedData<T = any> {
  data: T
  metadata: {
    version: string
    timestamp: number
    compressed: boolean
    encrypted: boolean
    checksum: string
  }
}

/**
 * DataSerializer class for handling complex data serialization
 */
export class DataSerializer {
  private static readonly STORAGE_KEYS = {
    USER_PREFERENCES: 'userPreferences',
    DASHBOARD_LAYOUT: 'dashboardLayout',
    TABLE_CONFIG: 'tableConfig',
  } as const

  /**
   * Generic serialize method
   */
  static serialize<T>(data: T, options?: SerializationOptions): SerializedData<T> {
    return this.createSerializedData(data, options)
  }

  /**
   * Generic deserialize method
   */
  static deserialize<T>(serializedData: string): T | null {
    return this.deserializeData(serializedData)
  }

  /**
   * Generic data serialization
   */
  static createSerializedData<T>(data: T, options: SerializationOptions = {}): SerializedData<T> {
    const serialized: SerializedData<T> = {
      data,
      metadata: {
        version: options.version || '1.0.0',
        timestamp: Date.now(),
        compressed: options.compress || false,
        encrypted: options.encrypt || false,
        checksum: this.generateChecksum(data)
      }
    }

    return serialized
  }

  /**
   * Generic data deserialization
   */
  static deserializeData<T>(serializedData: string): T | null {
    try {
      const parsed = JSON.parse(serializedData) as SerializedData<T>

      // Validate checksum
      if (parsed.metadata.checksum !== this.generateChecksum(parsed.data)) {
        console.warn('Data checksum mismatch - data may be corrupted')
      }

      return parsed.data
    } catch (error) {
      console.error('Failed to deserialize data:', error)
      return null
    }
  }

  /**
   * Generate a simple checksum for data integrity
   */
  private static generateChecksum(data: any): string {
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Compress data using simple RLE (Run Length Encoding)
   */
  static compressData(data: any): string {
    const str = JSON.stringify(data)
    let compressed = ''
    let count = 1
    let current = str[0]

    for (let i = 1; i < str.length; i++) {
      if (str[i] === current && count < 255) {
        count++
      } else {
        compressed += (count > 1 ? count : '') + current
        current = str[i]
        count = 1
      }
    }
    compressed += (count > 1 ? count : '') + current

    return compressed
  }

  /**
   * Decompress RLE data
   */
  static decompressData(compressed: string): any {
    let decompressed = ''
    let i = 0

    while (i < compressed.length) {
      let count = 1

      // Check if next character is a number (count)
      if (compressed[i + 1] && /\d/.test(compressed[i + 1])) {
        count = parseInt(compressed[i + 1])
        i += 2
      } else {
        i += 1
      }

      decompressed += compressed[i].repeat(count)
      i += 1
    }

    return JSON.parse(decompressed)
  }

  /**
   * Save user preferences
   */
  static saveUserPreferences(preferences: Record<string, any>): void {
    if (typeof window === 'undefined') return

    const serialized = this.createSerializedData(preferences, { version: '1.0.0' })
    localStorage.setItem(this.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(serialized))
  }

  /**
   * Get user preferences
   */
  static getUserPreferences(): Record<string, any> {
    if (typeof window === 'undefined') return {}

    const stored = localStorage.getItem(this.STORAGE_KEYS.USER_PREFERENCES)
    return stored ? (this.deserializeData(stored) || {}) : {}
  }

  /**
   * Export all data for backup
   */
  static exportAllData(): string {
    const allData = {
      tradingModels: this.getTradingModels(),
      userPreferences: this.getUserPreferences(),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }

    return JSON.stringify(allData, null, 2)
  }

  /**
   * Import data from backup
   */
  static importAllData(jsonData: string): boolean {
    try {
      const parsed = JSON.parse(jsonData)

      if (parsed.tradingModels) {
        this.saveTradingModels(parsed.tradingModels)
      }

      if (parsed.userPreferences) {
        this.saveUserPreferences(parsed.userPreferences)
      }

      return true
    } catch (error) {
      console.error('Failed to import data:', error)
      return false
    }
  }

  /**
   * Clear all stored data
   */
  static clearAllData(): void {
    if (typeof window === 'undefined') return

    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  /**
   * Get storage usage information
   */
  static getStorageInfo(): { key: string, size: number, lastModified: number | null }[] {
    if (typeof window === 'undefined') return []

    return Object.values(this.STORAGE_KEYS).map(key => {
      const item = localStorage.getItem(key)
      return {
        key,
        size: item ? new Blob([item]).size : 0,
        lastModified: null // localStorage doesn't track modification time
      }
    })
  }
}

