import * as ExcelJS from 'exceljs';
import {
  ParsedSchema,
  EventDefinition,
  PropertyDefinition,
  FunnelDefinition
} from '../types';

/**
 * Excel 파일에서 스키마 파싱
 */
export class ExcelParser {
  /**
   * Excel 파일 읽기 및 파싱
   */
  async parseExcelFile(filePath: string): Promise<ParsedSchema> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const events = this.parseEventsSheet(workbook);
    const properties = this.parsePropertiesSheet(workbook);
    const funnels = this.parseFunnelsSheet(workbook);

    return {
      events,
      properties,
      funnels
    };
  }

  /**
   * Events 시트 파싱
   */
  private parseEventsSheet(workbook: ExcelJS.Workbook): EventDefinition[] {
    const worksheet = workbook.getWorksheet('Events');
    if (!worksheet) {
      throw new Error('Events sheet not found in Excel file');
    }

    const events: EventDefinition[] = [];
    const headers = this.getHeaders(worksheet);

    worksheet.eachRow((row, rowNumber) => {
      // Skip header row
      if (rowNumber === 1) return;

      const rowData: any = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value;
        }
      });

      // required_previous_events는 쉼표로 구분된 문자열
      if (rowData.required_previous_events) {
        rowData.required_previous_events = String(rowData.required_previous_events)
          .split(',')
          .map(e => e.trim())
          .filter(e => e.length > 0);
      }

      // user_lifecycle_stage도 쉼표로 구분
      if (rowData.user_lifecycle_stage) {
        rowData.user_lifecycle_stage = String(rowData.user_lifecycle_stage)
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }

      // trigger_probability는 숫자로 변환
      if (rowData.trigger_probability) {
        rowData.trigger_probability = parseFloat(String(rowData.trigger_probability));
      }

      if (rowData.event_name) {
        events.push(rowData as EventDefinition);
      }
    });

    return events;
  }

  /**
   * Properties 시트 파싱
   */
  private parsePropertiesSheet(workbook: ExcelJS.Workbook): PropertyDefinition[] {
    const worksheet = workbook.getWorksheet('Properties');
    if (!worksheet) {
      throw new Error('Properties sheet not found in Excel file');
    }

    const properties: PropertyDefinition[] = [];
    const headers = this.getHeaders(worksheet);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData: any = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value;
        }
      });

      if (rowData.property_name) {
        properties.push(rowData as PropertyDefinition);
      }
    });

    return properties;
  }

  /**
   * Funnels 시트 파싱
   */
  private parseFunnelsSheet(workbook: ExcelJS.Workbook): FunnelDefinition[] {
    const worksheet = workbook.getWorksheet('Funnels');
    if (!worksheet) {
      // Funnels는 선택사항
      return [];
    }

    const funnels: FunnelDefinition[] = [];
    const headers = this.getHeaders(worksheet);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData: any = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value;
        }
      });

      // steps는 쉼표로 구분된 이벤트명
      if (rowData.steps) {
        rowData.steps = String(rowData.steps)
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }

      if (rowData.conversion_rate) {
        rowData.conversion_rate = parseFloat(String(rowData.conversion_rate));
      }

      if (rowData.name) {
        funnels.push(rowData as FunnelDefinition);
      }
    });

    return funnels;
  }

  /**
   * 시트의 헤더 추출
   */
  private getHeaders(worksheet: ExcelJS.Worksheet): string[] {
    const headers: string[] = [];
    const firstRow = worksheet.getRow(1);

    firstRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value || '').trim();
    });

    return headers;
  }
}
