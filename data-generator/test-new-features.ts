#!/usr/bin/env node
/**
 * 새로 추가된 기능들 테스트
 * - Pass-through Properties
 * - Segment Migration
 * - Event Interval Segment Multipliers
 * - Event-specific Hourly Weights
 * - Transaction States
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { ExcelParser } from './src/excel/parser';
import { AIClient } from './src/ai/client';
import { logger } from './src/utils/logger';

dotenv.config();

async function testNewFeatures() {
  try {
    logger.info('🧪 Testing New Features Implementation\n');

    // 1. Excel 파일 파싱 (가장 최근 파일 사용)
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

    // 3. AI 분석 실행 (Multi-Phase)
    logger.info('🔍 Step 3: Running AI analysis (Multi-Phase)...');
    const userInput = {
      scenario: '라이브 스트리밍 플랫폼 - 시청자와 스트리머가 실시간으로 소통하는 서비스',
      dau: 10000,
      industry: '소셜/라이브 스트리밍',
      notes: '실시간 채팅, 도네이션, 구독 기능 포함',
      dateRange: {
        start: '2025-01-01',
        end: '2025-01-07'
      }
    };

    const analysisResult = await aiClient.analyzeSchemaMultiPhase(schema, userInput);
    logger.info('✅ AI analysis completed\n');

    // 4. 새로운 필드들 검증
    logger.info('🔍 Step 4: Validating new features...\n');

    // 4-1. Segment Migrations
    logger.info('📌 Feature 1: Segment Migrations');
    if (analysisResult.segmentMigrations && analysisResult.segmentMigrations.length > 0) {
      logger.info(`✅ Found ${analysisResult.segmentMigrations.length} segment migrations:`);
      analysisResult.segmentMigrations.forEach((migration, idx) => {
        logger.info(`   ${idx + 1}. ${migration.fromSegment} → ${migration.toSegment}`);
        logger.info(`      Trigger: ${migration.trigger}, Probability: ${migration.probability}`);
        logger.info(`      Condition: ${migration.condition}`);
      });
    } else {
      logger.warn('⚠️  No segment migrations defined (optional feature)');
    }
    logger.info('');

    // 4-2. Event Sequencing - Pass-through Properties
    logger.info('📌 Feature 2: Pass-through Properties (Transactions)');
    if (analysisResult.eventSequencing?.transactions && analysisResult.eventSequencing.transactions.length > 0) {
      logger.info(`✅ Found ${analysisResult.eventSequencing.transactions.length} transactions:`);
      analysisResult.eventSequencing.transactions.forEach((txn, idx) => {
        logger.info(`   ${idx + 1}. ${txn.name}`);
        if (txn.passThroughProperties && txn.passThroughProperties.length > 0) {
          logger.info(`      ✅ Pass-through Properties: ${txn.passThroughProperties.join(', ')}`);
        } else {
          logger.warn(`      ⚠️  No pass-through properties defined`);
        }

        // Transaction States
        if (txn.transactionStates) {
          logger.info(`      ✅ Transaction States: ${txn.transactionStates.states.join(', ')}`);
        }
      });
    } else {
      logger.warn('⚠️  No transactions defined (domain may not require transactions)');
    }
    logger.info('');

    // 4-3. Event Interval Segment Multipliers
    logger.info('📌 Feature 3: Event Interval Segment Multipliers');
    if (analysisResult.eventSequencing?.eventIntervals) {
      const eventsWithMultipliers = Object.entries(analysisResult.eventSequencing.eventIntervals)
        .filter(([_, interval]) => interval.segmentMultipliers && Object.keys(interval.segmentMultipliers).length > 0);

      if (eventsWithMultipliers.length > 0) {
        logger.info(`✅ Found ${eventsWithMultipliers.length} events with segment multipliers:`);
        eventsWithMultipliers.slice(0, 3).forEach(([eventName, interval]) => {
          logger.info(`   - ${eventName}: avg ${interval.avgSeconds}s`);
          if (interval.segmentMultipliers) {
            Object.entries(interval.segmentMultipliers).forEach(([segment, multiplier]) => {
              logger.info(`      ${segment}: x${multiplier}`);
            });
          }
        });
        if (eventsWithMultipliers.length > 3) {
          logger.info(`   ... and ${eventsWithMultipliers.length - 3} more`);
        }
      } else {
        logger.warn('⚠️  No events with segment multipliers (optional feature)');
      }
    } else {
      logger.warn('⚠️  No event intervals defined');
    }
    logger.info('');

    // 4-4. Event-specific Hourly Weights
    logger.info('📌 Feature 4: Event-specific Hourly Weights');
    if (analysisResult.timingDistribution?.eventTimingOverrides) {
      const overrides = Object.keys(analysisResult.timingDistribution.eventTimingOverrides);
      if (overrides.length > 0) {
        logger.info(`✅ Found ${overrides.length} events with custom timing:`);
        overrides.forEach(eventName => {
          const override = analysisResult.timingDistribution!.eventTimingOverrides![eventName];
          logger.info(`   - ${eventName}`);
          if (override.description) {
            logger.info(`      ${override.description}`);
          }
          const peakHours = override.hourlyWeights
            .map((weight, hour) => ({ hour, weight }))
            .filter(h => h.weight > 0.1)
            .map(h => `${h.hour}h`)
            .join(', ');
          logger.info(`      Peak hours: ${peakHours}`);
        });
      } else {
        logger.warn('⚠️  No event timing overrides (optional feature)');
      }
    } else {
      logger.warn('⚠️  No timing distribution defined');
    }
    logger.info('');

    // 5. 전체 요약
    logger.info('📊 Summary\n');
    logger.info('='.repeat(80));
    logger.info('Feature Implementation Status:');
    logger.info('='.repeat(80));

    const features = [
      {
        name: 'Segment Migrations',
        implemented: analysisResult.segmentMigrations && analysisResult.segmentMigrations.length > 0
      },
      {
        name: 'Pass-through Properties',
        implemented: analysisResult.eventSequencing?.transactions?.some(t => t.passThroughProperties && t.passThroughProperties.length > 0)
      },
      {
        name: 'Transaction States',
        implemented: analysisResult.eventSequencing?.transactions?.some(t => t.transactionStates)
      },
      {
        name: 'Event Interval Segment Multipliers',
        implemented: analysisResult.eventSequencing?.eventIntervals &&
          Object.values(analysisResult.eventSequencing.eventIntervals).some(i => i.segmentMultipliers)
      },
      {
        name: 'Event-specific Hourly Weights',
        implemented: analysisResult.timingDistribution?.eventTimingOverrides &&
          Object.keys(analysisResult.timingDistribution.eventTimingOverrides).length > 0
      }
    ];

    features.forEach(feature => {
      const status = feature.implemented ? '✅ PASS' : '⚠️  NOT USED (Optional)';
      logger.info(`  ${feature.name.padEnd(40)} ${status}`);
    });

    logger.info('='.repeat(80));

    const passCount = features.filter(f => f.implemented).length;
    logger.info(`\n✅ ${passCount}/${features.length} features are being used by AI`);
    logger.info('\n🎉 Test completed successfully!\n');

  } catch (error: any) {
    logger.error('❌ Test failed:', error.message);
    if (process.env.DEBUG) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

// Run test
testNewFeatures();
