import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { TaxonomyBuilderV2 } from './taxonomy-builder-v2';
import {
  ExcelGenerationRequest,
  ExcelGenerationResult,
  TaxonomyData
} from './types';

export interface ExcelSchemaGeneratorOptions {
  outputDir: string;
  preferredProvider?: 'anthropic' | 'openai';
  anthropicKey?: string;
  openaiKey?: string;
  anthropicModel?: string;
  openaiModel?: string;
  promptPath?: string;
}

/**
 * Excel Schema Generator
 * Generates 4-sheet taxonomy Excel files using AI
 */
export class ExcelSchemaGenerator {
  private options: ExcelSchemaGeneratorOptions;

  constructor(options: ExcelSchemaGeneratorOptions) {
    this.options = options;
  }

  /**
   * Generate Excel taxonomy file
   */
  async generate(request: ExcelGenerationRequest): Promise<ExcelGenerationResult> {
    // 1. Generate taxonomy using 3-stage AI process
    const provider = this.resolveProvider();
    const builder = new TaxonomyBuilderV2({
      provider,
      apiKey: provider === 'anthropic' ? this.options.anthropicKey : this.options.openaiKey,
      model: provider === 'anthropic' ? this.options.anthropicModel : this.options.openaiModel,
      promptsDir: path.join(__dirname, '../prompts')
    });

    const taxonomy = await builder.build(request);

    // 2. Create output directory
    await fs.promises.mkdir(this.options.outputDir, { recursive: true });

    // 3. Generate file name and path
    const fileName = this.buildFileName(request);
    const filePath = path.join(this.options.outputDir, fileName);

    // 4. Write Excel workbook with 4 sheets
    await this.writeWorkbook(filePath, taxonomy);

    // 5. Get file stats
    const stats = await fs.promises.stat(filePath);

    return {
      success: true,
      filePath,
      fileName,
      taxonomy
    };
  }

  /**
   * Resolve which AI provider to use
   */
  private resolveProvider(): 'anthropic' | 'openai' {
    if (this.options.preferredProvider === 'openai' && this.options.openaiKey) {
      return 'openai';
    }
    if (this.options.preferredProvider === 'anthropic' && this.options.anthropicKey) {
      return 'anthropic';
    }
    if (this.options.anthropicKey) {
      return 'anthropic';
    }
    if (this.options.openaiKey) {
      return 'openai';
    }
    return 'anthropic';
  }

  /**
   * Build output file name
   */
  private buildFileName(request: ExcelGenerationRequest): string {
    const slug = this.slugify(request.industry || 'service');
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    return `${slug}_taxonomy.xlsx`;
  }

  /**
   * Write Excel workbook with 4 sheets
   */
  private async writeWorkbook(filePath: string, taxonomy: TaxonomyData): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ThinkingEngine Taxonomy Generator';
    workbook.created = new Date();

    // Create 4 sheets with exact structure
    this.addUserIdSystemSheet(workbook, taxonomy);
    this.addEventDataSheet(workbook, taxonomy);
    this.addCommonPropertiesSheet(workbook, taxonomy);
    this.addUserDataSheet(workbook, taxonomy);

    await workbook.xlsx.writeFile(filePath);
  }

  /**
   * Sheet 1: #유저 ID 체계
   * Columns: 유형 | 속성 이름 | 속성 별칭 | 속성 설명 | 값 설명
   */
  private addUserIdSystemSheet(workbook: ExcelJS.Workbook, taxonomy: TaxonomyData): void {
    const sheet = workbook.addWorksheet('#유저 ID 체계');

    // Header row
    const headerRow = sheet.addRow([
      '유형',
      '속성 이름',
      '속성 별칭',
      '속성 설명',
      '값 설명'
    ]);
    this.styleHeaderRow(headerRow);

    // Data rows
    taxonomy.userIdSystem.forEach(row => {
      sheet.addRow([
        row.type,
        row.propertyName,
        row.propertyAlias,
        row.description,
        row.valueDescription
      ]);
    });

    // Column widths
    sheet.columns = [
      { width: 15 },  // 유형
      { width: 20 },  // 속성 이름
      { width: 20 },  // 속성 별칭
      { width: 35 },  // 속성 설명
      { width: 35 }   // 값 설명
    ];
  }

  /**
   * Sheet 2: #이벤트 데이터
   * Columns: 이벤트 이름(필수) | 이벤트 별칭 | 이벤트 설명 | 이벤트 태그 |
   *          속성 이름(필수) | 속성 별칭 | 속성 유형(필수) | 속성 설명
   */
  private addEventDataSheet(workbook: ExcelJS.Workbook, taxonomy: TaxonomyData): void {
    const sheet = workbook.addWorksheet('#이벤트 데이터');

    // Header row
    const headerRow = sheet.addRow([
      '이벤트 이름',
      '이벤트 별칭',
      '이벤트 설명',
      '이벤트 태그',
      '속성 이름',
      '속성 별칭',
      '속성 유형',
      '속성 설명'
    ]);
    this.styleHeaderRow(headerRow);

    // Data rows
    taxonomy.eventData.forEach(row => {
      sheet.addRow([
        row.eventName,
        row.eventAlias,
        row.eventDescription,
        row.eventTag,
        row.propertyName,
        row.propertyAlias,
        row.propertyType,
        row.propertyDescription
      ]);
    });

    // Column widths
    sheet.columns = [
      { width: 25 },  // 이벤트 이름
      { width: 20 },  // 이벤트 별칭
      { width: 35 },  // 이벤트 설명
      { width: 15 },  // 이벤트 태그
      { width: 25 },  // 속성 이름
      { width: 20 },  // 속성 별칭
      { width: 15 },  // 속성 유형
      { width: 40 }   // 속성 설명
    ];
  }

  /**
   * Sheet 3: #공통 이벤트 속성
   * Columns: 속성 이름(필수) | 속성 별칭 | 속성 유형(필수) | 속성 설명
   */
  private addCommonPropertiesSheet(workbook: ExcelJS.Workbook, taxonomy: TaxonomyData): void {
    const sheet = workbook.addWorksheet('#공통 이벤트 속성');

    // Header row
    const headerRow = sheet.addRow([
      '속성 이름',
      '속성 별칭',
      '속성 유형',
      '속성 설명'
    ]);
    this.styleHeaderRow(headerRow);

    // Data rows
    taxonomy.commonProperties.forEach(row => {
      sheet.addRow([
        row.propertyName,
        row.propertyAlias,
        row.propertyType,
        row.description
      ]);
    });

    // Column widths
    sheet.columns = [
      { width: 25 },  // 속성 이름
      { width: 20 },  // 속성 별칭
      { width: 15 },  // 속성 유형
      { width: 45 }   // 속성 설명
    ];
  }

  /**
   * Sheet 4: #유저 데이터
   * Columns: 속성 이름(필수) | 속성 별칭 | 속성 유형(필수) | 업데이트 방식 | 속성 설명 | 속성 태그
   */
  private addUserDataSheet(workbook: ExcelJS.Workbook, taxonomy: TaxonomyData): void {
    const sheet = workbook.addWorksheet('#유저 데이터');

    // Header row
    const headerRow = sheet.addRow([
      '속성 이름',
      '속성 별칭',
      '속성 유형',
      '업데이트 방식',
      '속성 설명',
      '속성 태그'
    ]);
    this.styleHeaderRow(headerRow);

    // Data rows
    taxonomy.userData.forEach(row => {
      sheet.addRow([
        row.propertyName,
        row.propertyAlias,
        row.propertyType,
        row.updateMethod,
        row.description,
        row.tag
      ]);
    });

    // Column widths
    sheet.columns = [
      { width: 25 },  // 속성 이름
      { width: 20 },  // 속성 별칭
      { width: 15 },  // 속성 유형
      { width: 18 },  // 업데이트 방식
      { width: 40 },  // 속성 설명
      { width: 15 }   // 속성 태그
    ];
  }

  /**
   * Style header row with bold font and background color
   */
  private styleHeaderRow(row: ExcelJS.Row): void {
    row.font = { bold: true };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  /**
   * Convert string to slug format
   */
  private slugify(value: string): string {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
    return normalized || 'service';
  }
}
