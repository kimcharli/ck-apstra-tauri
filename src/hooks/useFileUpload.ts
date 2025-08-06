import { useState } from 'react';
import { ApiService } from '../services/api';

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [sheets, setSheets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (filePath: string) => {
    setIsUploading(true);
    setError(null);
    
    try {
      const sheetNames = await ApiService.uploadExcelFile(filePath);
      setSheets(sheetNames);
    } catch (err) {
      setError(err as string);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    sheets,
    error,
    uploadFile,
  };
};