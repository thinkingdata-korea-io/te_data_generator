/**
 * Test script for Excel Schema Generator
 *
 * Usage:
 *   ts-node test-generator.ts
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { ExcelSchemaGenerator } from './src/schema-generator';
import { ExcelGenerationRequest } from './src/types';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../data-generator/.env') });

async function test() {
  console.log('🚀 Excel Schema Generator 테스트 시작\n');

  // 1. 테스트 요청 데이터
  const request: ExcelGenerationRequest = {
    industry: '레이싱 게임',
    scenario: '카트라이더와 같은 캐주얼 레이싱 게임. 사용자는 다양한 카트와 캐릭터를 수집하고, 아이템 모드와 스피드 모드에서 경쟁합니다.',
    notes: '실시간 멀티플레이, 랭크 시스템, 가챠 시스템, 아이템 강화, 길드 시스템 포함'
  };

  console.log('📋 테스트 요청:');
  console.log(`  - 산업: ${request.industry}`);
  console.log(`  - 시나리오: ${request.scenario}`);
  console.log(`  - 특징: ${request.notes}\n`);

  // 2. Generator 초기화
  const generator = new ExcelSchemaGenerator({
    outputDir: path.join(__dirname, 'output/test'),
    preferredProvider: 'anthropic',
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: 'claude-sonnet-4-20250514',
    promptPath: path.join(__dirname, 'prompts/taxonomy-generator-prompt.md')
  });

  try {
    console.log('⚙️  AI를 사용하여 텍소노미 생성 중...\n');

    // 3. Excel 생성
    const result = await generator.generate(request);

    console.log('✅ Excel 파일 생성 완료!\n');
    console.log('📄 결과:');
    console.log(`  - 파일명: ${result.fileName}`);
    console.log(`  - 경로: ${result.filePath}`);
    console.log(`  - 성공: ${result.success}`);

    if (result.taxonomy) {
      console.log('\n📊 생성된 텍소노미 요약:');
      console.log(`  - 유저 ID 체계: ${result.taxonomy.userIdSystem.length}개`);
      console.log(`  - 이벤트 데이터: ${result.taxonomy.eventData.length}개`);
      console.log(`  - 공통 이벤트 속성: ${result.taxonomy.commonProperties.length}개`);
      console.log(`  - 유저 데이터: ${result.taxonomy.userData.length}개`);

      // Show sample events
      if (result.taxonomy.eventData.length > 0) {
        console.log('\n📝 샘플 이벤트 (첫 3개):');
        result.taxonomy.eventData.slice(0, 3).forEach((event, i) => {
          console.log(`  ${i + 1}. ${event.eventName} (${event.eventAlias}) - ${event.propertyName}`);
        });
      }
    }

    console.log('\n🎉 테스트 완료!');
    console.log(`📂 생성된 파일을 확인하세요: ${result.filePath}`);

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  }
}

// Run test
test();
