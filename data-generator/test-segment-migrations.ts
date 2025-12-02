#!/usr/bin/env node
/**
 * Segment Migrations 기능 테스트
 * - 게임 앱 시나리오: Casual Gamer → Engaged Player → Hardcore Gamer 전환
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { ExcelParser } from './src/excel/parser';
import { AIClient } from './src/ai/client';
import { logger } from './src/utils/logger';

dotenv.config();

async function testSegmentMigrations() {
  try {
    logger.info('🧪 Testing Segment Migrations Feature\n');

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

    // 3. 게임 앱 시나리오 (Segment Migrations가 명확한 케이스)
    logger.info('🔍 Step 3: Running AI analysis (Gaming App Scenario)...');
    const userInput = {
      scenario: '모바일 액션 RPG 게임 - 캐릭터 육성, PvP, 길드 시스템이 있는 게임. 초반에는 튜토리얼과 스토리 모드를 즐기다가, 시간이 지나면서 PvP, 길드전, 랭킹 경쟁에 몰입하는 패턴',
      dau: 10000,
      industry: '게임/RPG',
      notes: '신규 유저 → 일반 플레이어 → 하드코어 게이머로 자연스럽게 전환되는 패턴이 중요. 일부 유저는 휴면 → 복귀 패턴도 있음',
      dateRange: {
        start: '2025-01-01',
        end: '2025-01-07'
      }
    };

    const analysisResult = await aiClient.analyzeSchemaMultiPhase(schema, userInput);
    logger.info('✅ AI analysis completed\n');

    // 4. Segment Migrations 검증
    logger.info('🔍 Step 4: Validating Segment Migrations...\n');

    logger.info('📌 Feature: Segment Migrations');
    if (analysisResult.segmentMigrations && analysisResult.segmentMigrations.length > 0) {
      logger.info(`✅ Found ${analysisResult.segmentMigrations.length} segment migrations:\n`);

      analysisResult.segmentMigrations.forEach((migration, idx) => {
        logger.info(`   ${idx + 1}. ${migration.fromSegment} → ${migration.toSegment}`);
        logger.info(`      Trigger: ${migration.trigger}`);
        logger.info(`      Condition: ${migration.condition}`);
        logger.info(`      Probability: ${(migration.probability * 100).toFixed(0)}%`);
        if (migration.description) {
          logger.info(`      Description: ${migration.description}`);
        }
        logger.info('');
      });

      // 전환 패턴 분석
      const migrationPaths = new Map<string, string[]>();
      analysisResult.segmentMigrations.forEach(m => {
        if (!migrationPaths.has(m.fromSegment)) {
          migrationPaths.set(m.fromSegment, []);
        }
        migrationPaths.get(m.fromSegment)!.push(m.toSegment);
      });

      logger.info('📊 Migration Paths:');
      for (const [from, toList] of migrationPaths.entries()) {
        logger.info(`   ${from} → [${toList.join(', ')}]`);
      }
      logger.info('');

      // Success
      logger.info('='.repeat(80));
      logger.info('✅ PASS: Segment Migrations feature is working!');
      logger.info('='.repeat(80));
      logger.info(`\n🎉 Test completed successfully! Found ${analysisResult.segmentMigrations.length} migrations.\n`);

    } else {
      logger.error('❌ FAIL: No segment migrations defined');
      logger.error('   This scenario should have clear segment transitions (Casual → Engaged → Hardcore)');
      logger.error('   Please check the prompt engineering or try different scenario description\n');
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
testSegmentMigrations();
