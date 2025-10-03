import { invoke } from '@tauri-apps/api/tauri';
import { NetworkConfigRow } from '../../shared/types';

export class ExcelProcessingService {
  static async uploadFile(filePath: string): Promise<string[]> {
    return await invoke('upload_excel_file', { filePath });
  }

  static async parseSheet(filePath: string, sheetName: string): Promise<NetworkConfigRow[]> {
    return await invoke('parse_excel_sheet', { filePath, sheetName });
  }

  static async validateData(data: NetworkConfigRow[]): Promise<NetworkConfigRow[]> {
    return await invoke('validate_data', { data });
  }

  static async cleanupTempFile(fileId: string): Promise<void> {
    return await invoke('cleanup_temp_file', { fileId });
  }
}