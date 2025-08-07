/**
 * Utility functions for file downloads
 */

/**
 * Downloads JSON data as a file
 * @param data - The data to download as JSON
 * @param filename - The filename for the download
 */
export const downloadJSON = (data: any, filename: string): void => {
  try {
    // Convert data to JSON string with pretty formatting
    const jsonString = JSON.stringify(data, null, 2);
    
    // Create a Blob with the JSON data
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element and trigger download
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    
    // Add to DOM, click, and remove
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    
    // Clean up the URL
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download JSON file:', error);
    throw new Error(`Download failed: ${error}`);
  }
};

/**
 * Generates a filename for blueprint dumps
 * @param blueprintName - The name of the blueprint
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns Formatted filename like "blueprint-name-20240115T143025.json"
 */
export const generateBlueprintDumpFilename = (blueprintName: string, timestamp?: Date): string => {
  const now = timestamp || new Date();
  
  // Format timestamp as YYYYMMDDTHHMMSS
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const formattedTimestamp = `${year}${month}${day}T${hours}${minutes}${seconds}`;
  
  // Sanitize blueprint name for filename
  const sanitizedName = blueprintName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')  // Replace non-alphanumeric chars with dashes
    .replace(/-+/g, '-')           // Replace multiple dashes with single dash
    .replace(/^-|-$/g, '');        // Remove leading/trailing dashes
  
  return `${sanitizedName}-${formattedTimestamp}.json`;
};