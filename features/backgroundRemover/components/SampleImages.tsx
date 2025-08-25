"use client";

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface SampleImage {
  id: string;
  category: string;
  number: number;
  url: string;
  alt: string;
}

interface SampleImagesProps {
  // eslint-disable-next-line no-unused-vars
  onSampleSelect: (file: File) => void;
  disabled?: boolean;
}

// Import the generator utilities
import { 
  generateSampleImageUrl, 
  getAllSampleImageCombinations,
  AVAILABLE_CATEGORIES,
  type SampleImageOption,
  getSampleImageByCategory as getRandomSampleImageByCategory
} from '@/features/backgroundRemover/utils/sample-image-generator';

const ALL_SAMPLE_IMAGES = getAllSampleImageCombinations();

// Convert SampleImageOption to SampleImage format
const convertToSampleImage = (option: SampleImageOption): SampleImage => ({
  id: `${option.category}-${option.number}`,
  category: option.category,
  number: option.number,
  url: option.url,
  alt: `${option.category} sample image ${option.number}`
});

// Select 4 diverse samples for the default display
const SAMPLE_IMAGES: SampleImage[] = [
  convertToSampleImage(getRandomSampleImageByCategory(AVAILABLE_CATEGORIES[0])),
  convertToSampleImage(getRandomSampleImageByCategory(AVAILABLE_CATEGORIES[1])),
  convertToSampleImage(getRandomSampleImageByCategory(AVAILABLE_CATEGORIES[2])),
  convertToSampleImage(getRandomSampleImageByCategory(AVAILABLE_CATEGORIES[3])),
];

// Export utility functions for external use
export { generateSampleImageUrl, getAllSampleImageCombinations, ALL_SAMPLE_IMAGES };

export default function SampleImages({ onSampleSelect, disabled = false }: SampleImagesProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const downloadImageAsFile = useCallback(async (imageUrl: string, filename: string): Promise<File> => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Determine file type from response headers or URL
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      return new File([blob], filename, { type: contentType });
    } catch (error) {
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const handleSampleClick = useCallback(async (sample: SampleImage) => {
    if (disabled || loadingStates[sample.id]) return;

    setLoadingStates(prev => ({ ...prev, [sample.id]: true }));

    try {
      // Faster loading with minimal toast time
      const toastId = toast.loading('Loading...', { id: sample.id, duration: 1000 });
      
      const filename = `sample-${sample.category}-${sample.number}.jpg`;
      const file = await downloadImageAsFile(sample.url, filename);
      
      toast.dismiss(toastId);
      onSampleSelect(file);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sample image';
      toast.error(errorMessage, { id: sample.id });
    } finally {
      setLoadingStates(prev => ({ ...prev, [sample.id]: false }));
    }
  }, [disabled, loadingStates, downloadImageAsFile, onSampleSelect]);

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      {/* Compact horizontal layout - aligned right */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        {/* Title section */}
        <div className="flex-shrink-0">
          <div className="text-base-content/60 leading-relaxed text-center sm:text-right">
            <span className="text-sm font-normal">No image?</span>
            <br />
            <span className="text-sm font-normal">Try one of these:</span>
          </div>
        </div>

        {/* Images in a horizontal row */}
        <div className="flex gap-3 overflow-hidden pb-2">
          {SAMPLE_IMAGES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSampleClick(sample)}
              disabled={disabled || loadingStates[sample.id]}
              className={`
                relative group overflow-hidden rounded-lg border-2 transition-all duration-200 flex-shrink-0
                w-16 h-16 sm:w-20 sm:h-20
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary cursor-pointer'}
                ${loadingStates[sample.id] ? 'border-primary bg-primary/5' : 'border-base-300'}
              `}
            >
              {/* Loading overlay */}
              {loadingStates[sample.id] && (
                <div className="absolute inset-0 bg-base-100/80 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="loading loading-spinner loading-sm text-primary"></div>
                </div>
              )}

              {/* Image */}
              <div className="absolute inset-0 bg-base-200">
                <Image
                  src={sample.url}
                  alt={sample.alt}
                  fill
                  className="object-cover transition-transform duration-200 group-hover:scale-110"
                  sizes="80px"
                  onError={() => {
                    console.warn(`Failed to load sample image: ${sample.url}`);
                  }}
                />
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 rounded-full p-1">
                  <svg 
                    className="w-3 h-3 text-primary" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M12 4v16m8-8H4" 
                    />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Info text */}
      <div className="mt-3 text-center sm:text-right">
        <p className="text-xs text-base-content/50">
          Sample images provided for demonstration purposes
        </p>
      </div>
    </div>
  );
}
