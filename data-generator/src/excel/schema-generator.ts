import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { ExcelParser } from './parser';
import { TaxonomyBuilder, ReferenceDocument } from './taxonomy-builder';
import {
  ExcelGenerationRequest,
  TaxonomyPlan,
  EventDefinition,
  PropertyDefinition,
  FunnelDefinition
} from '../types';

export interface ExcelSchemaGeneratorOptions {
  outputDir: string;
  preferredProvider?: 'anthropic' | 'openai';
  anthropicKey?: string;
  openaiKey?: string;
  anthropicModel?: string;
  openaiModel?: string;
  referenceDocsDir?: string;
}

export interface ExcelPreviewSummary {
  events: number;
  properties: number;
  funnels: number;
  eventNames: string[];
  generatedAt: string;
  provider: 'anthropic' | 'openai' | 'fallback';
  requestedEventCount: number;
}

export interface ExcelSchemaGeneratorResult {
  filePath: string;
  fileName: string;
  size: number;
  generatedAt: string;
  preview: ExcelPreviewSummary;
  taxonomy: TaxonomyPlan;
}

export class ExcelSchemaGenerator {
  private options: ExcelSchemaGeneratorOptions;

  constructor(options: ExcelSchemaGeneratorOptions) {
    this.options = options;
  }

  async generate(request: ExcelGenerationRequest): Promise<ExcelSchemaGeneratorResult> {
    const provider = this.resolveProvider();
    const targetEventCount = normalizeEventCount(request.eventCount);
    const referenceDocs = await this.loadReferenceDocs();
    const builder = new TaxonomyBuilder({
      provider,
      apiKey: provider === 'anthropic' ? this.options.anthropicKey : this.options.openaiKey,
      model: provider === 'anthropic' ? this.options.anthropicModel : this.options.openaiModel,
      referenceDocs
    });

    const taxonomy = await builder.build(request, { targetEventCount });
    const usedStrategy = builder.lastStrategy;
    const providerLabel: 'anthropic' | 'openai' | 'fallback' = usedStrategy === 'fallback' ? 'fallback' : provider;

    const fileName = this.buildFileName(request);
    const filePath = path.join(this.options.outputDir, fileName);
    await fs.promises.mkdir(this.options.outputDir, { recursive: true });
    await this.writeWorkbook(filePath, request, taxonomy, providerLabel);

    const stats = await fs.promises.stat(filePath);
    const generatedAt = new Date().toISOString();

    const preview: ExcelPreviewSummary = {
      events: taxonomy.events.length,
      properties: taxonomy.properties.length,
      funnels: taxonomy.funnels.length,
      eventNames: taxonomy.events.slice(0, 8).map(event => event.event_name),
      generatedAt,
      provider: providerLabel,
      requestedEventCount: targetEventCount
    };

    return {
      filePath,
      fileName,
      size: stats.size,
      generatedAt,
      preview,
      taxonomy
    };
  }

  private async loadReferenceDocs(): Promise<ReferenceDocument[]> {
    const dir = this.options.referenceDocsDir;
    if (!dir) return [];
    if (!fs.existsSync(dir)) return [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const docs: ReferenceDocument[] = [];
    const parser = new ExcelParser();

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filePath = path.join(dir, entry.name);
      const baseName = entry.name.replace(/\.[^.]+$/, '');

      if (/\.(md|markdown|txt)$/i.test(entry.name)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8').trim();
          if (!content) continue;
          docs.push({
            name: baseName,
            content
          });
        } catch (error) {
          console.warn(`⚠️  Failed to read reference doc ${entry.name}:`, (error as Error).message);
        }
        continue;
      }

      if (/\.xlsx$/i.test(entry.name)) {
        try {
          const schema = await parser.parseExcelFile(filePath);
          const summary = summarizeExcelSchema(baseName, schema.events, schema.properties, schema.funnels);
          if (summary) {
            docs.push({
              name: baseName,
              content: summary
            });
          }
        } catch (error) {
          console.warn(`⚠️  Failed to parse reference Excel ${entry.name}:`, (error as Error).message);
        }
      }
    }

    return docs;
  }

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

  private buildFileName(request: ExcelGenerationRequest): string {
    const slug = slugify(request.industry || 'service');
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    return `${timestamp}_${slug}_taxonomy.xlsx`;
  }

  private async writeWorkbook(
    filePath: string,
    request: ExcelGenerationRequest,
    taxonomy: TaxonomyPlan,
    provider: 'anthropic' | 'openai' | 'fallback'
  ) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ThinkingEngine Generator';
    workbook.created = new Date();

    this.addOverviewSheet(workbook, request, taxonomy, provider);
    this.addEventsSheet(workbook, taxonomy);
    this.addPropertiesSheet(workbook, taxonomy);
    if (taxonomy.funnels.length > 0) {
      this.addFunnelsSheet(workbook, taxonomy);
    }

    await workbook.xlsx.writeFile(filePath);
  }

  private addOverviewSheet(
    workbook: ExcelJS.Workbook,
    request: ExcelGenerationRequest,
    taxonomy: TaxonomyPlan,
    provider: 'anthropic' | 'openai' | 'fallback'
  ) {
    const sheet = workbook.addWorksheet('#Overview');
    sheet.addTable({
      name: 'ServiceInfo',
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleMedium9', showRowStripes: true },
      columns: [
        { name: '항목' },
        { name: '값' }
      ],
      rows: [
        ['시나리오', request.scenario],
        ['산업', request.industry],
        ['서비스 특징', request.notes],
        ['목표 DAU', request.dau ? String(request.dau) : '미입력'],
        ['기간', request.dateStart && request.dateEnd ? `${request.dateStart} ~ ${request.dateEnd}` : '미입력'],
        ['생성 방식', provider === 'fallback' ? 'Rule-based Template' : provider === 'anthropic' ? 'Claude' : 'GPT']
      ]
    });

    const segmentStartRow = sheet.rowCount + 3;
    sheet.getCell(`A${segmentStartRow}`).value = '사용자 세그먼트';
    sheet.getCell(`A${segmentStartRow}`).font = { bold: true };
    sheet.addTable({
      name: 'Segments',
      ref: `A${segmentStartRow + 1}`,
      headerRow: true,
      style: { theme: 'TableStyleLight11', showRowStripes: true },
      columns: [
        { name: '세그먼트' },
        { name: '비율' },
        { name: '설명' }
      ],
      rows: taxonomy.segments.length
        ? taxonomy.segments.map(segment => [
          segment.name,
          segment.ratio !== undefined ? `${(segment.ratio * 100).toFixed(1)}%` : '-',
          segment.notes || ''
        ])
        : [['default', '100%', '세그먼트 정보 없음']]
    });

    if (taxonomy.insights?.length) {
      const insightRow = sheet.rowCount + 3;
      sheet.getCell(`A${insightRow}`).value = '추천 지표';
      sheet.getCell(`A${insightRow}`).font = { bold: true };
      taxonomy.insights.forEach((insight, index) => {
        sheet.getCell(`A${insightRow + index + 1}`).value = `• ${insight}`;
      });
    }

    sheet.columns = [
      { width: 26 },
      { width: 80 }
    ];
  }

  private addEventsSheet(workbook: ExcelJS.Workbook, taxonomy: TaxonomyPlan) {
    const sheet = workbook.addWorksheet('#Events');
    const header = [
      'event_name',
      'event_name_kr',
      'description',
      'category',
      'property_name',
      'property_description',
      'data_type',
      'required',
      'example_value'
    ];
    const headerRow = sheet.addRow(header);
    headerRow.font = { bold: true };

    taxonomy.events.forEach(event => {
      const properties = taxonomy.properties.filter(prop => prop.event_name === event.event_name);
      if (properties.length === 0) {
        sheet.addRow([
          event.event_name,
          event.event_name_kr,
          event.description || '',
          event.category || '',
          '',
          '',
          '',
          '',
          ''
        ]);
        return;
      }

      properties.forEach((prop, index) => {
        sheet.addRow([
          index === 0 ? event.event_name : '',
          index === 0 ? event.event_name_kr : '',
          index === 0 ? (event.description || '') : '',
          index === 0 ? (event.category || '') : '',
          prop.property_name,
          prop.description || prop.property_name_kr,
          prop.data_type,
          prop.required ? 'Y' : '',
          prop.example || ''
        ]);
      });
    });

    sheet.columns = [
      { width: 24 },
      { width: 24 },
      { width: 36 },
      { width: 16 },
      { width: 24 },
      { width: 36 },
      { width: 14 },
      { width: 10 },
      { width: 18 }
    ];
  }

  private addPropertiesSheet(workbook: ExcelJS.Workbook, taxonomy: TaxonomyPlan) {
    const sheet = workbook.addWorksheet('#Properties');
    const header = [
      'property_name',
      'property_name_kr',
      'data_type',
      'event_name',
      'description',
      'required',
      'example',
      'allowed_values'
    ];
    const headerRow = sheet.addRow(header);
    headerRow.font = { bold: true };

    taxonomy.properties.forEach(prop => {
      sheet.addRow([
        prop.property_name,
        prop.property_name_kr,
        prop.data_type,
        prop.event_name || 'GLOBAL',
        prop.description || '',
        prop.required ? 'Y' : '',
        prop.example || '',
        prop.allowed_values ? prop.allowed_values.join(', ') : ''
      ]);
    });

    sheet.columns = [
      { width: 24 },
      { width: 28 },
      { width: 16 },
      { width: 24 },
      { width: 42 },
      { width: 10 },
      { width: 18 },
      { width: 26 }
    ];
  }

  private addFunnelsSheet(workbook: ExcelJS.Workbook, taxonomy: TaxonomyPlan) {
    const sheet = workbook.addWorksheet('#Funnels');
    const headerRow = sheet.addRow(['name', 'description', 'steps', 'conversion_rate']);
    headerRow.font = { bold: true };

    taxonomy.funnels.forEach(funnel => {
      sheet.addRow([
        funnel.name,
        funnel.description || '',
        funnel.steps.join(', '),
        funnel.conversion_rate !== undefined ? funnel.conversion_rate : ''
      ]);
    });

    sheet.columns = [
      { width: 24 },
      { width: 40 },
      { width: 44 },
      { width: 18 }
    ];
  }
}

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'service';
}

function summarizeExcelSchema(
  sourceName: string,
  events: EventDefinition[],
  properties: PropertyDefinition[],
  funnels: FunnelDefinition[]
): string {
  const lines: string[] = [];
  const propertyCountByEvent = new Map<string, number>();

  for (const prop of properties) {
    const key = prop.event_name || 'GLOBAL';
    propertyCountByEvent.set(key, (propertyCountByEvent.get(key) || 0) + 1);
  }

  lines.push(`# ${sourceName} Excel Schema`);
  lines.push(`- 이벤트 ${events.length}개, 속성 ${properties.length}개, 퍼널 ${funnels.length}개`);

  if (events.length) {
    lines.push('\n## 대표 이벤트');
    events.slice(0, 12).forEach(evt => {
      const count = propertyCountByEvent.get(evt.event_name) || 0;
      lines.push(`- ${evt.event_name} (${evt.event_name_kr || evt.category || ''}) · 속성 ${count}개 · 카테고리 ${evt.category || 'N/A'}`);
    });
  }

  const globalProperties = properties.filter(prop => !prop.event_name);
  if (globalProperties.length) {
    lines.push('\n## 공통 속성 예시');
    globalProperties.slice(0, 8).forEach(prop => {
      lines.push(`- ${prop.property_name} (${prop.data_type}) · ${prop.description || prop.property_name_kr || ''}`);
    });
  }

  if (funnels.length) {
    lines.push('\n## 퍼널 요약');
    funnels.slice(0, 4).forEach(funnel => {
      lines.push(`- ${funnel.name}: ${funnel.steps.join(' → ')}`);
    });
  }

  return lines.join('\n');
}

function normalizeEventCount(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 12;
  }
  return Math.max(6, Math.min(100, Math.round(value)));
}
