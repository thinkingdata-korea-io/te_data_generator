// @file: data-generator/src/api/services/file-analyzer.ts
// @brief: AI-powered file content analysis service using Anthropic Claude

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

export interface FileAnalysisResult {
  fileName: string;
  fileType: string;
  analysis: string;
  insights: {
    documentType?: string;
    keyContent?: string[];
    keywords?: string[];
    contextNotes?: string[];
  };
}

export interface MultiFileAnalysisResult {
  files: FileAnalysisResult[];
  combinedInsights: string;
  recommendedContext: {
    domain: string;
    coreContent: string;
    additionalNotes: string;
  };
}

export class FileAnalyzer {
  private anthropic: Anthropic | null = null;
  private model: string;
  private maxTokens: number;

  constructor(apiKey?: string, model: string = 'claude-3-5-sonnet-20241022', maxTokens: number = 2000) {
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
    this.model = model;
    this.maxTokens = maxTokens;
  }

  /**
   * 파일 타입을 미디어 타입으로 변환
   */
  private getMediaType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mediaTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };
    return mediaTypes[ext] || 'application/octet-stream';
  }

  /**
   * 파일이 이미지인지 확인
   */
  private isImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
  }

  /**
   * 파일이 PDF인지 확인
   */
  private isPDFFile(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.pdf';
  }

  /**
   * 텍스트 파일 읽기
   */
  private async readTextFile(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.py', '.java', '.go', '.rs', '.swift', '.kt'];

    if (textExtensions.includes(ext)) {
      return fs.readFileSync(filePath, 'utf-8');
    }

    return '';
  }

  /**
   * 단일 파일 분석
   */
  async analyzeFile(filePath: string): Promise<FileAnalysisResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    const fileName = path.basename(filePath);
    const fileType = path.extname(filePath).toLowerCase();

    try {
      // 이미지 또는 PDF 파일
      if (this.isImageFile(filePath) || this.isPDFFile(filePath)) {
        const fileData = fs.readFileSync(filePath);
        const base64Data = fileData.toString('base64');
        const mediaType = this.getMediaType(filePath);

        const message = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: this.maxTokens,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
                    data: base64Data,
                  },
                },
                {
                  type: 'text',
                  text: `이 파일의 내용을 분석하여 요약해주세요.

다음 관점에서 파일 내용을 파악하고 정리해주세요:
1. **문서/파일 유형**: 무엇에 관한 자료인가? (예: 기획서, 화면설계서, API 명세, 데이터 스키마, 가이드라인 등)
2. **주요 내용 요약**: 핵심적으로 다루는 내용이 무엇인가?
3. **중요 키워드/개념**: 반복적으로 나오거나 중요한 용어, 기능명, 데이터 항목 등
4. **추가 컨텍스트**: Taxonomy 설계나 데이터 생성 시 참고할 만한 특징이나 제약사항

간결하고 명확하게 한국어로 답변해주세요.`,
                },
              ],
            },
          ],
        });

        const analysis = message.content[0].type === 'text' ? message.content[0].text : '';

        return {
          fileName,
          fileType,
          analysis,
          insights: this.extractInsights(analysis),
        };
      }

      // 텍스트 파일
      const textContent = await this.readTextFile(filePath);
      if (textContent) {
        const message = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: this.maxTokens,
          messages: [
            {
              role: 'user',
              content: `다음 파일의 내용을 분석하여 요약해주세요:

파일명: ${fileName}

내용:
${textContent.substring(0, 8000)}

다음 관점에서 파일 내용을 파악하고 정리해주세요:
1. **문서/파일 유형**: 무엇에 관한 자료인가? (예: 기획서, 화면설계서, API 명세, 데이터 스키마, 코드, 가이드라인 등)
2. **주요 내용 요약**: 핵심적으로 다루는 내용이 무엇인가?
3. **중요 키워드/개념**: 반복적으로 나오거나 중요한 용어, 기능명, 데이터 항목, 변수명 등
4. **추가 컨텍스트**: Taxonomy 설계나 데이터 생성 시 참고할 만한 특징이나 제약사항

간결하고 명확하게 한국어로 답변해주세요.`,
            },
          ],
        });

        const analysis = message.content[0].type === 'text' ? message.content[0].text : '';

        return {
          fileName,
          fileType,
          analysis,
          insights: this.extractInsights(analysis),
        };
      }

      // 지원하지 않는 파일 타입
      return {
        fileName,
        fileType,
        analysis: '이 파일 타입은 직접 분석할 수 없습니다. 파일명과 확장자만 참고됩니다.',
        insights: {},
      };
    } catch (error: any) {
      console.error(`파일 분석 실패 (${fileName}):`, error);
      return {
        fileName,
        fileType,
        analysis: `분석 실패: ${error.message}`,
        insights: {},
      };
    }
  }

  /**
   * 여러 파일 동시 분석 및 통합
   */
  async analyzeMultipleFiles(filePaths: string[]): Promise<MultiFileAnalysisResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    // 각 파일 개별 분석
    const fileAnalyses = await Promise.all(
      filePaths.map(filePath => this.analyzeFile(filePath))
    );

    // 모든 분석 결과를 통합해서 최종 컨텍스트 생성
    const combinedAnalysisText = fileAnalyses
      .map(fa => `[${fa.fileName}]\n${fa.analysis}`)
      .join('\n\n---\n\n');

    const message = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: Math.floor(this.maxTokens * 0.75), // 다중 파일은 75% 토큰 사용
      messages: [
        {
          role: 'user',
          content: `다음은 사용자가 업로드한 여러 파일들의 분석 결과입니다. 이 정보를 종합하여 전체 컨텍스트를 요약해주세요:

${combinedAnalysisText}

다음 형식으로 요약해주세요:

**문서 주제/도메인**: (파일들이 다루는 전반적인 주제나 도메인을 한 줄로)
**핵심 내용**: (파일들에서 추출한 주요 개념, 기능, 데이터 항목 등을 쉼표로 구분)
**추가 참고사항**: (Taxonomy 설계나 데이터 생성 시 고려할 특징, 제약사항, 기술 스택 등)

각 항목은 간결하고 명확하게 한국어로 작성해주세요.`,
        },
      ],
    });

    const combinedInsights = message.content[0].type === 'text' ? message.content[0].text : '';

    // 권장 컨텍스트 추출
    const recommendedContext = this.extractRecommendedContext(combinedInsights);

    return {
      files: fileAnalyses,
      combinedInsights,
      recommendedContext,
    };
  }

  /**
   * AI 응답에서 인사이트 추출 (간단한 파싱)
   */
  private extractInsights(analysisText: string): FileAnalysisResult['insights'] {
    const insights: FileAnalysisResult['insights'] = {
      documentType: undefined,
      keyContent: [],
      keywords: [],
      contextNotes: [],
    };

    // 간단한 키워드 기반 추출 (실제로는 AI가 구조화된 응답을 제공)
    const lines = analysisText.split('\n');

    for (const line of lines) {
      if (line.includes('문서') || line.includes('파일 유형')) {
        insights.documentType = line.trim();
      }
      if (line.includes('주요 내용') || line.includes('요약')) {
        insights.keyContent?.push(line.trim());
      }
      if (line.includes('키워드') || line.includes('개념')) {
        insights.keywords?.push(line.trim());
      }
      if (line.includes('컨텍스트') || line.includes('참고') || line.includes('제약')) {
        insights.contextNotes?.push(line.trim());
      }
    }

    return insights;
  }

  /**
   * 통합 인사이트에서 권장 컨텍스트 추출
   */
  private extractRecommendedContext(combinedInsights: string): MultiFileAnalysisResult['recommendedContext'] {
    const lines = combinedInsights.split('\n');

    let domain = '';
    let coreContent = '';
    let additionalNotes = '';

    for (const line of lines) {
      if (line.includes('**문서 주제/도메인**') || line.includes('주제:') || line.includes('도메인:')) {
        domain = line.replace(/\*\*/g, '').replace('문서 주제/도메인:', '').replace('주제:', '').replace('도메인:', '').trim();
      }
      if (line.includes('**핵심 내용**') || line.includes('내용:')) {
        coreContent = line.replace(/\*\*/g, '').replace('핵심 내용:', '').replace('내용:', '').trim();
      }
      if (line.includes('**추가 참고사항**') || line.includes('참고:')) {
        additionalNotes = line.replace(/\*\*/g, '').replace('추가 참고사항:', '').replace('참고:', '').trim();
      }
    }

    return {
      domain: domain || '정보 부족',
      coreContent: coreContent || '파일 분석 결과를 참고해주세요',
      additionalNotes: additionalNotes || combinedInsights.substring(0, 200),
    };
  }
}
