import type { BackgroundRemovalConfig } from '@/features/backgroundRemover/types/image';

// Default configuration for Remove.bg (most popular service)
const DEFAULT_REMOVE_BG_CONFIG: BackgroundRemovalConfig = {
  service: 'remove.bg',
  apiKey: process.env.REMOVE_BG_API_KEY || '',
  quality: 'auto',
  format: 'png',
};

export class BackgroundRemovalService {
  private config: BackgroundRemovalConfig;

  constructor(config: Partial<BackgroundRemovalConfig> = {}) {
    this.config = { ...DEFAULT_REMOVE_BG_CONFIG, ...config };
  }

  /**
   * Remove background using Remove.bg API
   */
  private async removeBackgroundWithRemoveBg(imageBuffer: Buffer): Promise<Buffer> {
    const startTime = Date.now();
    console.log(`🔄 [Remove.bg] Starting background removal (buffer size: ${imageBuffer.length} bytes)`);
    
    if (!this.config.apiKey) {
      console.error('❌ [Remove.bg] API key not configured');
      throw new Error('Remove.bg API key is not configured');
    }

    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
      formData.append('image_file', blob);
      formData.append('size', this.config.quality || 'auto');

      console.log(`📤 [Remove.bg] Sending request with quality: ${this.config.quality || 'auto'}`);

      // Add timeout control using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('⏰ [Remove.bg] Request timeout after 60 seconds');
        controller.abort();
      }, 60000); // 60 second timeout

      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': this.config.apiKey,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      const requestTime = Date.now() - startTime;
      console.log(`📥 [Remove.bg] Response received (${response.status}) after ${requestTime}ms`);

      if (!response.ok) {
        let errorMessage = `Remove.bg API error: ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.errors?.[0]?.title || errorMessage;
          console.error(`❌ [Remove.bg] API error details:`, errorData);
        } catch {
          // Fallback to status text if JSON parsing fails
          errorMessage = `${errorMessage} - ${response.statusText}`;
          console.error(`❌ [Remove.bg] Failed to parse error response`);
        }
        
        throw new Error(errorMessage);
      }

      console.log(`🔄 [Remove.bg] Converting response to buffer...`);
      const arrayBuffer = await response.arrayBuffer();
      const resultBuffer = Buffer.from(arrayBuffer);
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ [Remove.bg] Successfully completed in ${totalTime}ms (result size: ${resultBuffer.length} bytes)`);
      
      return resultBuffer;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`⏰ [Remove.bg] Request aborted due to timeout after ${totalTime}ms`);
        throw new Error('Remove.bg request timed out after 60 seconds');
      }
      
      console.error(`❌ [Remove.bg] Error after ${totalTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Remove background using Clipdrop API (alternative service)
   */
  private async removeBackgroundWithClipdrop(imageBuffer: Buffer): Promise<Buffer> {
    if (!process.env.CLIPDROP_API_KEY) {
      throw new Error('Clipdrop API key is not configured');
    }

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
    formData.append('image_file', blob);

    const response = await fetch('https://clipdrop-api.co/remove-background/v1', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLIPDROP_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Clipdrop API error: ${response.status} - ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Mock background removal for development/testing
   */
  private async mockBackgroundRemoval(imageBuffer: Buffer): Promise<Buffer> {
    // In development, just return the original image
    // In a real implementation, you might apply some basic image processing
    console.log('⚠️  [Mock] Starting mock background removal');
    console.log(`⚠️  [Mock] Input buffer size: ${imageBuffer.length} bytes`);
    
    // Add a small delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ [Mock] Mock background removal completed successfully');
    return imageBuffer;
  }

  /**
   * Remove background from image buffer
   */
  async removeBackground(imageBuffer: Buffer): Promise<Buffer> {
    const serviceInfo = this.getServiceInfo();
    console.log(`🎯 [BackgroundRemoval] Starting with service: ${serviceInfo.service}, hasApiKey: ${serviceInfo.hasApiKey}, isProduction: ${serviceInfo.isProduction}`);
    
    // TODO: Remove this after testing
    return await this.mockBackgroundRemoval(imageBuffer);
    try {
      switch (this.config.service) {
        case 'remove.bg':
          console.log(`🔧 [BackgroundRemoval] Using Remove.bg service`);
          return await this.removeBackgroundWithRemoveBg(imageBuffer);
        case 'clipdrop':
          console.log(`🔧 [BackgroundRemoval] Using Clipdrop service`);
          return await this.removeBackgroundWithClipdrop(imageBuffer);
        default:
          // Fallback to mock for development
          if (process.env.NODE_ENV === 'development' && !this.config.apiKey) {
            console.log('🧪 Development mode: Using mock background removal');
            return await this.mockBackgroundRemoval(imageBuffer);
          }
          throw new Error(`Unsupported background removal service: ${this.config.service}`);
      }
    } catch (error) {
      console.error('❌ [BackgroundRemoval] Service failed:', error);
      
      // In development, fallback to mock if API fails
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 API failed in development, falling back to mock');
        return await this.mockBackgroundRemoval(imageBuffer);
      }
      
      throw error;
    }
  }

  /**
   * Get service usage information
   */
  getServiceInfo(): { service: string; hasApiKey: boolean; isProduction: boolean } {
    return {
      service: this.config.service,
      hasApiKey: !!this.config.apiKey,
      isProduction: process.env.NODE_ENV === 'production',
    };
  }

  /**
   * Validate service configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (process.env.NODE_ENV === 'production' && !this.config.apiKey) {
      errors.push(`${this.config.service} API key is required in production`);
    }

    if (!['remove.bg', 'clipdrop'].includes(this.config.service)) {
      errors.push(`Unsupported service: ${this.config.service}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
