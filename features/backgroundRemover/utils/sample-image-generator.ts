// Utility functions for generating sample image URLs
// This demonstrates all possible combinations available

export interface SampleImageOption {
  category: string;
  number: number;
  url: string;
}

// Updated to match the local images in public/images/
export const AVAILABLE_CATEGORIES = ['person', 'animal', 'car', 'object'] as const;
export const AVAILABLE_NUMBERS = [1, 2, 3] as const;

export type Category = typeof AVAILABLE_CATEGORIES[number];
export type ImageNumber = typeof AVAILABLE_NUMBERS[number];

/**
 * Generates a sample image URL from local public/images directory
 * @param category - The image category (person, animal, car, object)
 * @param number - The image number (1-3)
 * @returns The complete URL for the local sample image
 */
export function generateSampleImageUrl(category: Category, number: ImageNumber): string {
  return `/images/${number}_${category}.jpg`;
}

/**
 * Gets all possible sample image combinations
 * @returns Array of all 12 possible sample images (4 categories × 3 numbers)
 */
export function getAllSampleImageCombinations(): SampleImageOption[] {
  const combinations: SampleImageOption[] = [];
  
  AVAILABLE_CATEGORIES.forEach(category => {
    AVAILABLE_NUMBERS.forEach(number => {
      combinations.push({
        category,
        number,
        url: generateSampleImageUrl(category, number)
      });
    });
  });
  
  return combinations;
}

/**
 * Gets sample images for a specific category
 * @param category - The category to get images for
 * @returns Array of 5 images for the specified category
 */
export function getSampleImagesByCategory(category: Category): SampleImageOption[] {
  return AVAILABLE_NUMBERS.map(number => ({
    category,
    number,
    url: generateSampleImageUrl(category, number)
  }));
}

export function getSampleImageByCategory(category: Category): SampleImageOption {
  const allImages = getSampleImagesByCategory(category);
  const randomIndex = Math.floor(Math.random() * allImages.length);
  return allImages[randomIndex];
}

/**
 * Gets a random sample image
 * @returns A random sample image option
 */
export function getRandomSampleImage(): SampleImageOption {
  const allImages = getAllSampleImageCombinations();
  const randomIndex = Math.floor(Math.random() * allImages.length);
  return allImages[randomIndex];
}

/**
 * Gets sample images by number across all categories
 * @param number - The number to get across all categories
 * @returns Array of 4 images (one per category) with the specified number
 */
export function getSampleImagesByNumber(number: ImageNumber): SampleImageOption[] {
  return AVAILABLE_CATEGORIES.map(category => ({
    category,
    number,
    url: generateSampleImageUrl(category, number)
  }));
}

