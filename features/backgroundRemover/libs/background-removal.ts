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
    if (!this.config.apiKey) {
      throw new Error('Remove.bg API key is not configured');
    }

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
    formData.append('image_file', blob);
    formData.append('size', this.config.quality || 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': this.config.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `Remove.bg API error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.errors?.[0]?.title || errorMessage;
      } catch {
        // Fallback to status text if JSON parsing fails
        errorMessage = `${errorMessage} - ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
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
    console.log('⚠️  Using mock background removal - no actual processing');
    return imageBuffer;
  }

  /**
   * Remove background from image buffer
   */
  async removeBackground(imageBuffer: Buffer): Promise<Buffer> {
    try {
      switch (this.config.service) {
        case 'remove.bg':
          return await this.removeBackgroundWithRemoveBg(imageBuffer);
        case 'clipdrop':
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
      console.error('Background removal failed:', error);
      
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
