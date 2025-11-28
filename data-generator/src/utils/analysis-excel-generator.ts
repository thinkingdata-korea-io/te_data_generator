import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { AIAnalysisResult } from '../types';
import { logger } from './logger';

/**
 * AI 분석 결과를 Excel 파일로 생성
 * 사용자가 검토하고 수정할 수 있는 형태
 */
export class AnalysisExcelGenerator {
  /**
   * AI 분석 결과를 Excel 파일로 저장
   */
  static async generateAnalysisExcel(
    aiAnalysis: AIAnalysisResult,
    outputPath: string,
    metadata?: {
      industry?: string;
      scenario?: string;
      originalExcelFile?: string;
    }
  ): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: 사용자 세그먼트
    const segmentSheet = this.createSegmentSheet(aiAnalysis);
    XLSX.utils.book_append_sheet(workbook, segmentSheet, '1_사용자_세그먼트');

    // Sheet 2: 이벤트 순서 규칙
    const sequencingSheet = this.createSequencingSheet(aiAnalysis);
    XLSX.utils.book_append_sheet(workbook, sequencingSheet, '2_이벤트_순서_규칙');

    // Sheet 3: 트랜잭션 정의
    if (aiAnalysis.eventSequencing?.transactions) {
      const transactionSheet = this.createTransactionSheet(aiAnalysis);
      XLSX.utils.book_append_sheet(workbook, transactionSheet, '3_트랜잭션_정의');
    }

    // Sheet 4: 이벤트 속성 범위
    const propertySheet = this.createPropertyRangeSheet(aiAnalysis);
    XLSX.utils.book_append_sheet(workbook, propertySheet, '4_속성_범위');

    // Sheet 5: 검증 규칙 요약
    const validationSheet = this.createValidationSheet(aiAnalysis);
    XLSX.utils.book_append_sheet(workbook, validationSheet, '5_검증_규칙');

    // Sheet 6: 메타데이터
    const metadataSheet = this.createMetadataSheet(aiAnalysis, metadata);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, '6_메타데이터');

    // 파일 저장
    const fileName = `AI_Analysis_${Date.now()}.xlsx`;
    const fullPath = path.join(outputPath, fileName);

    // 디렉토리 생성
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    XLSX.writeFile(workbook, fullPath);
    logger.info(`✅ AI 분석 결과 Excel 생성 완료: ${fullPath}`);

    return fullPath;
  }

  /**
   * Sheet 1: 사용자 세그먼트
   */
  private static createSegmentSheet(aiAnalysis: AIAnalysisResult): XLSX.WorkSheet {
    const data: any[][] = [
      ['사용자 세그먼트 분석'],
      [],
      ['세그먼트명', '비율(%)', '특성', '평균 세션/일', '평균 세션 시간(분)', '평균 이벤트/세션'],
    ];

    aiAnalysis.userSegments.forEach(segment => {
      const sessionsPerDay = aiAnalysis.sessionPatterns.avgSessionsPerDay[segment.name] || 0;
      const sessionDuration = (aiAnalysis.sessionPatterns.avgSessionDuration[segment.name] || 0) / 1000 / 60;
      const eventsPerSession = aiAnalysis.sessionPatterns.avgEventsPerSession[segment.name] || 0;

      data.push([
        segment.name,
        (segment.ratio * 100).toFixed(1),
        segment.characteristics,
        sessionsPerDay.toFixed(1),
        sessionDuration.toFixed(1),
        eventsPerSession.toFixed(0)
      ]);
    });

    data.push([]);
    data.push(['💡 수정 가능:', '비율, 세션 패턴 등을 수정하여 재업로드할 수 있습니다.']);

    return XLSX.utils.aoa_to_sheet(data);
  }

  /**
   * Sheet 2: 이벤트 순서 규칙
   */
  private static createSequencingSheet(aiAnalysis: AIAnalysisResult): XLSX.WorkSheet {
    const data: any[][] = [
      ['이벤트 순서 규칙'],
      [],
      ['📌 이벤트 카테고리'],
      ['카테고리', '이벤트 목록'],
    ];

    const sequencing = aiAnalysis.eventSequencing;
    if (sequencing) {
      Object.entries(sequencing.eventCategories).forEach(([category, events]) => {
        data.push([category, events.join(', ')]);
      });

      data.push([]);
      data.push(['📌 필수 선행 이벤트 (strictDependencies)']);
      data.push(['이벤트', '선행 필수 이벤트']);

      Object.entries(sequencing.strictDependencies).forEach(([event, deps]) => {
        data.push([event, deps.join(', ')]);
      });

      data.push([]);
      data.push(['📌 실행 제약 (executionConstraints)']);
      data.push(['이벤트', '제약 유형', '제약 값']);

      Object.entries(sequencing.executionConstraints).forEach(([event, constraints]) => {
        if (constraints.maxOccurrencesPerSession) {
          data.push([event, '세션당 최대 횟수', constraints.maxOccurrencesPerSession]);
        }
        if (constraints.maxOccurrencesPerUser) {
          data.push([event, '유저당 최대 횟수', constraints.maxOccurrencesPerUser]);
        }
        if (constraints.requiresFirstSession) {
          data.push([event, '첫 세션 전용', 'true']);
        }
        if (constraints.blockedAfterEvents) {
          data.push([event, '차단 규칙 (이후 불가)', constraints.blockedAfterEvents.join(', ')]);
        }
      });
    }

    data.push([]);
    data.push(['💡 수정 가능:', '카테고리, 의존성, 제약사항을 수정할 수 있습니다.']);

    return XLSX.utils.aoa_to_sheet(data);
  }

  /**
   * Sheet 3: 트랜잭션 정의
   */
  private static createTransactionSheet(aiAnalysis: AIAnalysisResult): XLSX.WorkSheet {
    const data: any[][] = [
      ['트랜잭션 정의 (시작-종료 패턴)'],
      [],
      ['트랜잭션명', '설명', '시작 이벤트', '종료 이벤트', '내부 이벤트', '종료 후 내부 허용'],
    ];

    const transactions = aiAnalysis.eventSequencing?.transactions || [];
    transactions.forEach(transaction => {
      data.push([
        transaction.name,
        transaction.description,
        transaction.startEvents.join(', '),
        transaction.endEvents.join(', '),
        transaction.innerEvents.join(', '),
        transaction.allowInnerAfterEnd ? '허용' : '차단'
      ]);
    });

    data.push([]);
    data.push(['💡 핵심:', '종료 이벤트 발생 후 내부 이벤트가 차단되어 논리적으로 불가능한 시퀀스를 방지합니다.']);
    data.push(['예시:', 'game_end 후 death 차단, purchase_complete 후 cart_add 차단']);

    return XLSX.utils.aoa_to_sheet(data);
  }

  /**
   * Sheet 4: 이벤트 속성 범위
   */
  private static createPropertyRangeSheet(aiAnalysis: AIAnalysisResult): XLSX.WorkSheet {
    const data: any[][] = [
      ['이벤트 속성 범위 (AI 생성)'],
      [],
      ['이벤트', '속성명', '타입', '최소값', '최대값', '선택값', '가중치'],
    ];

    aiAnalysis.eventRanges.forEach(eventRange => {
      eventRange.properties.forEach(prop => {
        let values = '';
        let weights = '';

        if (prop.type === 'choice') {
          values = (prop.values || []).join(', ');
          weights = (prop.weights || []).map(w => (w * 100).toFixed(0) + '%').join(', ');
        }

        data.push([
          eventRange.event_name,
          prop.property_name,
          prop.type,
          prop.min?.toString() || '',
          prop.max?.toString() || '',
          values,
          weights
        ]);
      });
    });

    data.push([]);
    data.push(['💡 수정 가능:', '속성의 범위, 선택값, 가중치를 조정할 수 있습니다.']);

    return XLSX.utils.aoa_to_sheet(data);
  }

  /**
   * Sheet 5: 검증 규칙 요약
   */
  private static createValidationSheet(aiAnalysis: AIAnalysisResult): XLSX.WorkSheet {
    const data: any[][] = [
      ['검증 규칙 요약'],
      [],
      ['규칙 유형', '설명', '상세'],
    ];

    // 트랜잭션 차단 규칙
    const transactions = aiAnalysis.eventSequencing?.transactions || [];
    transactions.forEach(transaction => {
      if (!transaction.allowInnerAfterEnd) {
        const blockedEvents = transaction.innerEvents.join(', ');
        const endEvents = transaction.endEvents.join(', ');
        data.push([
          '트랜잭션 차단',
          `"${transaction.name}" 종료 후 내부 이벤트 차단`,
          `${endEvents} 발생 후 ${blockedEvents} 불가`
        ]);
      }
    });

    // blockedAfterEvents 규칙
    const constraints = aiAnalysis.eventSequencing?.executionConstraints || {};
    Object.entries(constraints).forEach(([event, constraint]) => {
      if (constraint.blockedAfterEvents) {
        data.push([
          '이벤트 차단',
          `"${event}" 실행 불가 조건`,
          `${constraint.blockedAfterEvents.join(', ')} 이후 차단`
        ]);
      }
    });

    data.push([]);
    data.push(['✅ 이 규칙들이 데이터 생성 시 자동으로 적용되어 논리적으로 불가능한 시퀀스를 방지합니다.']);

    return XLSX.utils.aoa_to_sheet(data);
  }

  /**
   * Sheet 6: 메타데이터
   */
  private static createMetadataSheet(
    aiAnalysis: AIAnalysisResult,
    metadata?: { industry?: string; scenario?: string; originalExcelFile?: string }
  ): XLSX.WorkSheet {
    const data: any[][] = [
      ['AI 분석 메타데이터'],
      [],
      ['항목', '값'],
      ['생성 시각', new Date().toISOString()],
      ['산업', metadata?.industry || 'N/A'],
      ['시나리오', metadata?.scenario || 'N/A'],
      ['원본 Excel', metadata?.originalExcelFile || 'N/A'],
      [],
      ['분석 결과 요약'],
      ['사용자 세그먼트 수', aiAnalysis.userSegments.length],
      ['이벤트 범위 수', aiAnalysis.eventRanges.length],
      ['트랜잭션 수', aiAnalysis.eventSequencing?.transactions?.length || 0],
      ['의존성 규칙 수', Object.keys(aiAnalysis.eventDependencies).length],
      [],
      ['💡 사용 방법'],
      ['1. 이 Excel을 다운로드하여 검토합니다.'],
      ['2. 필요한 경우 값을 수정합니다 (비율, 범위, 규칙 등).'],
      ['3. 수정된 Excel을 재업로드하여 데이터 생성에 반영합니다.'],
      ['4. 또는 그대로 "데이터 생성" 버튼을 눌러 진행합니다.'],
    ];

    return XLSX.utils.aoa_to_sheet(data);
  }
}
