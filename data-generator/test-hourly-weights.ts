#!/usr/bin/env node
/**
 * Event-specific Hourly Weights 기능 테스트
 * - 음식 배달 앱 시나리오: 아침/점심/저녁 주문 시간대가 명확하게 다름
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { ExcelParser } from './src/excel/parser';
import { AIClient } from './src/ai/client';
import { logger } from './src/utils/logger';

dotenv.config();

async function testHourlyWeights() {
  try {
    logger.info('🧪 Testing Event-specific Hourly Weights Feature\n');

    // 1. Excel 파일 파싱
    const excelFile = path.resolve('./uploads/1764658684845_[레드버튼]_이벤트 텍소노미.xlsx');
    logger.info('📖 Step 1: Parsing Excel schema...');
    const parser = new ExcelParser();
    const schema = await parser.parseExcelFile(excelFile);
    logger.info(`✅ Loaded ${schema.events.length} events, ${schema.properties.length} properties\n`);

    // 2. AI 클라이언트 설정
    logger.info('🤖 Step 2: Initializing AI client...');
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('API key not found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY');
    }

    const aiClient = new AIClient({
      provider: process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai',
      apiKey,
      model: process.env.ANTHROPIC_API_KEY ? 'claude-sonnet-4-20250514' : 'gpt-4o',
      language: 'ko'
    });
    logger.info('✅ AI client initialized\n');

    // 3. 음식 배달 앱 시나리오 (시간대별 주문 패턴이 명확)
    logger.info('🔍 Step 3: Running AI analysis (Food Delivery App Scenario)...');
    const userInput = {
      scenario: '음식 배달 앱 - 아침 7-9시 브런치 주문, 점심 11시-1시 도시락 주문, 저녁 6-8시 저녁 식사 주문이 집중됨. 새벽 시간대에는 야식 주문(치킨, 피자)이 발생. 각 식사 시간대마다 주문 패턴과 메뉴 선호도가 다름',
      dau: 10000,
      industry: '배달/O2O',
      notes: '시간대별로 특정 이벤트들(breakfast_order, lunch_order, dinner_order, late_night_order)의 발생 시간이 명확하게 구분됨',
      dateRange: {
        start: '2025-01-01',
        end: '2025-01-07'
      }
    };

    const analysisResult = await aiClient.analyzeSchemaMultiPhase(schema, userInput);
    logger.info('✅ AI analysis completed\n');

    // 4. Event-specific Hourly Weights 검증
    logger.info('🔍 Step 4: Validating Event-specific Hourly Weights...\n');

    logger.info('📌 Feature: Event-specific Hourly Weights');
    if (analysisResult.timingDistribution?.eventTimingOverrides) {
      const overrides = Object.keys(analysisResult.timingDistribution.eventTimingOverrides);
      if (overrides.length > 0) {
        logger.info(`✅ Found ${overrides.length} events with custom timing:\n`);

        overrides.forEach(eventName => {
          const override = analysisResult.timingDistribution!.eventTimingOverrides![eventName];
          logger.info(`   📅 ${eventName}`);

          if (override.description) {
            logger.info(`      Description: ${override.description}`);
          }

          // 피크 시간대 분석
          const hourlyWeights = override.hourlyWeights;
          const maxWeight = Math.max(...hourlyWeights);
          const peakHours = hourlyWeights
            .map((weight, hour) => ({ hour, weight }))
            .filter(h => h.weight > maxWeight * 0.5) // 최대값의 50% 이상인 시간대
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 5); // 상위 5개 시간대

          logger.info(`      Peak Hours:`);
          peakHours.forEach(({ hour, weight }) => {
            const percentage = (weight * 100).toFixed(1);
            const bar = '█'.repeat(Math.round(weight * 50));
            logger.info(`        ${hour.toString().padStart(2, '0')}:00 - ${percentage.padStart(5)}% ${bar}`);
          });
          logger.info('');
        });

        // Success
        logger.info('='.repeat(80));
        logger.info('✅ PASS: Event-specific Hourly Weights feature is working!');
        logger.info('='.repeat(80));
        logger.info(`\n🎉 Test completed successfully! Found ${overrides.length} events with custom timing.\n`);

      } else {
        logger.error('❌ FAIL: No event timing overrides defined');
        logger.error('   This scenario should have time-specific events (breakfast, lunch, dinner orders)');
        logger.error('   Please check the prompt engineering or try different scenario description\n');
        process.exit(1);
      }
    } else {
      logger.error('❌ FAIL: No timing distribution defined');
      process.exit(1);
    }

  } catch (error: any) {
    logger.error('❌ Test failed:', error.message);
    if (process.env.DEBUG) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

// Run test
testHourlyWeights();
