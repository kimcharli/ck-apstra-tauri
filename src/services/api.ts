import { invoke } from '@tauri-apps/api/tauri';
import { NetworkConfigRow, ProcessingResult } from '../types';

export class ApiService {
  static async uploadExcelFile(filePath: string): Promise<string[]> {
    return await invoke('upload_excel_file', { filePath });
  }

  static async parseExcelSheet(filePath: string, sheetName: string): Promise<NetworkConfigRow[]> {
    return await invoke('parse_excel_sheet', { filePath, sheetName });
  }

  static async validateData(data: NetworkConfigRow[]): Promise<NetworkConfigRow[]> {
    return await invoke('validate_data', { data });
  }

  static async processImportGenericSystem(data: NetworkConfigRow[]): Promise<ProcessingResult> {
    return await invoke('process_import_generic_system', { data });
  }

  static async getProcessingProgress(jobId: string): Promise<number> {
    return await invoke('get_processing_progress', { jobId });
  }

  static async cleanupTempFile(fileId: string): Promise<void> {
    return await invoke('cleanup_temp_file', { fileId });
  }
}