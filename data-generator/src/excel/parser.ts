import * as XLSX from 'xlsx';
import {
  ParsedSchema,
  EventDefinition,
  PropertyDefinition,
  FunnelDefinition,
  UserDataDefinition
} from '../types';
import { logger } from '../utils/logger';

/**
 * Excel 파일에서 스키마 파싱
 */
export class ExcelParser {
  /**
   * Excel 파일 읽기 및 파싱
   */
  async parseExcelFile(filePath: string): Promise<ParsedSchema> {
    // xlsx 라이브러리로 파일 읽기 (이미지 등은 자동으로 무시됨)
    const workbook = XLSX.readFile(filePath, {
      cellStyles: false,
      cellHTML: false
    });

    const events = this.parseEventsSheet(workbook);

    // 속성은 Events 시트와 별도 Properties 시트 둘 다에서 파싱
    const propertiesFromEvents = this.parsePropertiesFromEventsSheet(workbook);
    const propertiesFromSheet = this.parsePropertiesSheet(workbook);

    // 중복 제거하며 병합
    const propertiesMap = new Map<string, PropertyDefinition>();

    // Events 시트의 속성 우선
    propertiesFromEvents.forEach(prop => {
      const key = `${prop.event_name || 'global'}_${prop.property_name}`;
      propertiesMap.set(key, prop);
    });

    // Properties 시트의 속성 추가 (중복되지 않으면)
    propertiesFromSheet.forEach(prop => {
      const key = `${prop.event_name || 'global'}_${prop.property_name}`;
      if (!propertiesMap.has(key)) {
        propertiesMap.set(key, prop);
      }
    });

    const properties = Array.from(propertiesMap.values());
    const funnels = this.parseFunnelsSheet(workbook);
    const userData = this.parseUserDataSheet(workbook);

    // 디버그: 속성 분류 확인
    const eventProps = properties.filter(p => p.event_name);
    const commonProps = properties.filter(p => !p.event_name);
    logger.info(`📊 Parsed from Excel: events=${events.length}, eventProps=${eventProps.length}, commonProps=${commonProps.length}, userData=${userData.length}`);

    // 마케팅 스키마 병합은 데이터 생성 시점에만 수행
    // Excel 파싱은 파일 내용만 반환
    return {
      events,
      properties,
      funnels,
      userData
    };
  }

  /**
   * Events 시트 파싱
   *
   * 이미지의 구조:
   * - Column A: 이벤트 이름 (병합될 수 있음)
   * - Column B: 이벤트 설명
   * - Column C: 이벤트 설명 (상세)
   * - Column D: 이벤트 태그
   * - Column E: 속성 이름
   * - Column F: 속성 설명
   * - Column G: 속성 유형
   *
   * 이 메서드는 이벤트만 파싱하고, 속성은 parsePropertiesFromEventsSheet에서 파싱
   */
  private parseEventsSheet(workbook: XLSX.WorkBook): EventDefinition[] {
    // #Events, Events, #이벤트 데이터 등 여러 이름으로 찾기
    const possibleNames = ['#Events', 'Events', '#이벤트 데이터', '이벤트 데이터', '#이벤트'];
    let sheetName = possibleNames.find(name => workbook.Sheets[name]);

    if (!sheetName) {
      const available = Object.keys(workbook.Sheets).join(', ');
      throw new Error(`Events sheet not found. Available sheets: ${available}`);
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any>(worksheet, {
      header: 1, // Array of arrays
      defval: ''
    });

    const events: EventDefinition[] = [];
    const eventMap = new Map<string, EventDefinition>();
    let currentEventName: string | null = null;

    // Skip header row (index 0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      try {
        // 이벤트 이름 (Column A, index 0)
        const eventName = this.getCellStringValue(row[0]);
        if (eventName) {
          currentEventName = eventName;
        }

        // 이벤트 설명 (Column B, index 1)
        const eventDesc = this.getCellStringValue(row[1]);

        // 이벤트 태그/카테고리 (Column D, index 3)
        const eventTag = this.getCellStringValue(row[3]);

        // 현재 이벤트가 있으면 추가/업데이트
        if (currentEventName) {
          if (!eventMap.has(currentEventName)) {
            eventMap.set(currentEventName, {
              event_name: currentEventName,
              event_name_kr: eventDesc || currentEventName,
              category: eventTag || 'general',
              trigger_probability: 0.8
            });
          }
        }
      } catch (rowError: any) {
        logger.warn(`⚠️  Skipping row ${i + 1}:`, rowError.message);
      }
    }

    // Map을 배열로 변환
    eventMap.forEach(event => events.push(event));

    return events;
  }

  /**
   * Events 시트에서 속성 파싱
   * (이벤트와 속성이 같은 시트에 있는 경우)
   */
  private parsePropertiesFromEventsSheet(workbook: XLSX.WorkBook): PropertyDefinition[] {
    // #Events, Events, #이벤트 데이터 등 여러 이름으로 찾기
    const possibleNames = ['#Events', 'Events', '#이벤트 데이터', '이벤트 데이터', '#이벤트'];
    const sheetName = possibleNames.find(name => workbook.Sheets[name]);

    if (!sheetName) {
      return [];
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any>(worksheet, {
      header: 1,
      defval: ''
    });

    const properties: PropertyDefinition[] = [];
    let currentEventName: string | null = null;

    // Skip header row (index 0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // 이벤트 이름 (Column A, index 0) - 병합된 셀 추적
      const eventName = this.getCellStringValue(row[0]);
      if (eventName) {
        currentEventName = eventName;
      }

      // 속성 이름 (Column E, index 4)
      const propName = this.getCellStringValue(row[4]);

      if (propName && currentEventName) {
        // 속성 설명 (Column F, index 5)
        const propDesc = this.getCellStringValue(row[5]);

        // 속성 유형 (Column G, index 6)
        const propType = this.getCellStringValue(row[6]);
        const normalizedType = propType ? propType.toLowerCase().trim() : 'string';

        // Object group 및 중첩 속성 감지
        const isObjectGroup = normalizedType === 'object group';
        const isObject = normalizedType === 'object';
        const isNestedProperty = propName.includes('.');
        const parentProperty = isNestedProperty ? propName.split('.')[0] : undefined;

        properties.push({
          property_name: propName,
          property_name_kr: propDesc || propName,
          data_type: normalizedType,
          event_name: currentEventName,
          description: propDesc || undefined,
          is_object_group: isObjectGroup,
          is_object: isObject,
          is_nested_property: isNestedProperty,
          parent_property: parentProperty
        });
      }
    }

    return properties;
  }

  /**
   * Properties 시트 파싱
   */
  private parsePropertiesSheet(workbook: XLSX.WorkBook): PropertyDefinition[] {
    // #Properties, Properties, #공통 이벤트 속성 등 여러 이름으로 찾기
    const possibleNames = ['#Properties', 'Properties', '#공통 이벤트 속성', '공통 이벤트 속성', '#속성'];
    const sheetName = possibleNames.find(name => workbook.Sheets[name]);

    if (!sheetName) {
      // Properties 시트가 없을 수 있음 (Events 시트에 통합된 경우)
      return [];
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any>(worksheet, {
      defval: ''
    });

    const properties: PropertyDefinition[] = [];

    for (const row of data) {
      // 한글 및 영문 컬럼명 모두 지원
      const propName = row['속성 이름'] || row.property_name;

      if (propName) {
        const normalizedPropName = String(propName).trim();
        const normalizedType = (row['속성 유형'] || row.data_type || 'string').toString().trim().toLowerCase();

        // Object group 및 중첩 속성 감지
        const isObjectGroup = normalizedType === 'object group';
        const isObject = normalizedType === 'object';
        const isNestedProperty = normalizedPropName.includes('.');
        const parentProperty = isNestedProperty ? normalizedPropName.split('.')[0] : undefined;

        properties.push({
          property_name: normalizedPropName,
          property_name_kr: row['속성 별칭'] || row.property_name_kr || normalizedPropName,
          data_type: normalizedType,
          event_name: row['이벤트 이름'] || row.event_name ? String(row['이벤트 이름'] || row.event_name).trim() : undefined,
          description: row['속성 설명'] || row.description ? String(row['속성 설명'] || row.description).trim() : undefined,
          is_object_group: isObjectGroup,
          is_object: isObject,
          is_nested_property: isNestedProperty,
          parent_property: parentProperty
        });
      }
    }

    return properties;
  }

  /**
   * Funnels 시트 파싱
   */
  private parseFunnelsSheet(workbook: XLSX.WorkBook): FunnelDefinition[] {
    // #Funnels 또는 Funnels 시트 찾기
    let sheetName = '#Funnels';
    if (!workbook.Sheets[sheetName]) {
      sheetName = 'Funnels';
    }
    if (!workbook.Sheets[sheetName]) {
      // Funnels는 선택사항
      return [];
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any>(worksheet, {
      defval: ''
    });

    const funnels: FunnelDefinition[] = [];

    for (const row of data) {
      if (row.name) {
        const funnel: FunnelDefinition = {
          name: String(row.name).trim(),
          description: row.description ? String(row.description).trim() : undefined,
          steps: [],
          conversion_rate: row.conversion_rate ? parseFloat(String(row.conversion_rate)) : undefined
        };

        // steps는 쉼표로 구분된 이벤트명
        if (row.steps) {
          funnel.steps = String(row.steps)
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        }

        funnels.push(funnel);
      }
    }

    return funnels;
  }

  /**
   * UserData 시트 파싱
   */
  private parseUserDataSheet(workbook: XLSX.WorkBook): UserDataDefinition[] {
    // #유저 데이터, UserData, User Data 등 여러 이름으로 찾기
    const possibleNames = ['#유저 데이터', '유저 데이터', '#UserData', 'UserData', '#User Data', 'User Data', '#유저속성', '유저속성'];
    const sheetName = possibleNames.find(name => workbook.Sheets[name]);

    if (!sheetName) {
      // UserData 시트가 없을 수 있음 (선택사항)
      return [];
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any>(worksheet, {
      defval: ''
    });

    const userData: UserDataDefinition[] = [];

    for (const row of data) {
      // 속성 이름이 있으면 추가
      if (row['속성 이름'] || row.property_name) {
        const propName = row['속성 이름'] || row.property_name;
        const propNameKr = row['속성 별칭'] || row.property_name_kr || propName;
        const dataType = row['속성 유형'] || row.data_type || row.type || 'string';
        const updateMethod = row['업데이트 방식'] || row.update_method || 'userset';
        const description = row['속성 설명'] || row.description || '';
        const tag = row['속성 태그'] || row.tag || '';

        userData.push({
          property_name: String(propName).trim(),
          property_name_kr: String(propNameKr).trim(),
          data_type: String(dataType).trim().toLowerCase(),
          update_method: String(updateMethod).trim().toLowerCase(),
          description: description ? String(description).trim() : undefined,
          tag: tag ? String(tag).trim() : undefined
        });
      }
    }

    return userData;
  }

  /**
   * 셀 값을 문자열로 변환
   */
  private getCellStringValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return String(value).trim();
  }
}
