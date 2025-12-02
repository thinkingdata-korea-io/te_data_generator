#!/usr/bin/env node
/**
 * Transaction States 기능 테스트
 * - 복잡한 게임 라운드 시나리오: active → paused → resumed → ended 상태 전이
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { ExcelParser } from './src/excel/parser';
import { AIClient } from './src/ai/client';
import { logger } from './src/utils/logger';

dotenv.config();

async function testTransactionStates() {
  try {
    logger.info('🧪 Testing Transaction States Feature\n');

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

    // 3. 복잡한 게임 라운드 시나리오
    logger.info('🔍 Step 3: Running AI analysis (Complex Game Round Scenario)...');
    const userInput = {
      scenario: '멀티플레이어 FPS 게임 - 게임 매치는 round_start로 시작하고, 게임 중 pause 가능 (설정 메뉴, 네트워크 끊김), resume으로 재개, round_end로 종료. 매치 도중 reconnect, disconnect 이벤트도 발생. 각 상태에서 허용되는 이벤트가 다름 (예: paused 상태에서는 shoot, move 불가)',
      dau: 10000,
      industry: '게임/FPS',
      notes: '게임 라운드는 복잡한 상태 전이를 가짐: active (플레이 중) → paused (일시정지) → resumed (재개) → ended (종료). 각 상태마다 허용되는 이벤트가 다름',
      dateRange: {
        start: '2025-01-01',
        end: '2025-01-07'
      }
    };

    const analysisResult = await aiClient.analyzeSchemaMultiPhase(schema, userInput);
    logger.info('✅ AI analysis completed\n');

    // 4. Transaction States 검증
    logger.info('🔍 Step 4: Validating Transaction States...\n');

    logger.info('📌 Feature: Transaction States');
    if (analysisResult.eventSequencing?.transactions) {
      const transactionsWithStates = analysisResult.eventSequencing.transactions.filter(
        t => t.transactionStates
      );

      if (transactionsWithStates.length > 0) {
        logger.info(`✅ Found ${transactionsWithStates.length} transactions with state machines:\n`);

        transactionsWithStates.forEach((txn, idx) => {
          logger.info(`   ${idx + 1}. ${txn.name}`);
          logger.info(`      Description: ${txn.description}`);

          if (txn.transactionStates) {
            const states = txn.transactionStates;

            // States
            logger.info(`      States: [${states.states.join(', ')}]`);

            // Allowed Events per State
            logger.info(`      Allowed Events by State:`);
            for (const [state, events] of Object.entries(states.allowedEvents)) {
              logger.info(`        - ${state}: [${events.join(', ')}]`);
            }

            // State Transitions
            if (states.stateTransitions) {
              logger.info(`      State Transitions:`);
              for (const [fromState, toStates] of Object.entries(states.stateTransitions)) {
                logger.info(`        - ${fromState} → [${toStates.join(', ')}]`);
              }
            }
          }
          logger.info('');
        });

        // Success
        logger.info('='.repeat(80));
        logger.info('✅ PASS: Transaction States feature is working!');
        logger.info('='.repeat(80));
        logger.info(`\n🎉 Test completed successfully! Found ${transactionsWithStates.length} transactions with state machines.\n`);

      } else {
        logger.error('❌ FAIL: No transactions with state machines defined');
        logger.error('   This scenario should have complex state transitions (active → paused → resumed → ended)');
        logger.error('   Please check the prompt engineering or try different scenario description\n');
        process.exit(1);
      }
    } else {
      logger.error('❌ FAIL: No transactions defined');
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
testTransactionStates();
