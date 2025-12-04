#!/usr/bin/env node

/**
 * CLI 진입점
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { DataGenerator, DataGeneratorConfig } from './data-generator';
import { ExcelParser } from './excel/parser';
import { DataValidator, formatValidationResult } from './validators/data-validator';
import { logger } from './utils/logger';

// 환경변수 로드
dotenv.config();

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'generate':
      await generateData(args.slice(1));
      break;

    case 'validate':
      await validateData(args.slice(1));
      break;

    case 'upload':
      logger.info('Upload command - use LogBus2Controller directly');
      break;

    default:
      logger.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

async function validateData(args: string[]) {
  try {
    const excelFile = getArg(args, '--excel', '-e');
    const dataPath = getArg(args, '--data', '-d') || '../output/data';
    const runId = getArg(args, '--run-id', '-r');

    if (!excelFile) {
      logger.error('❌ Excel schema file required');
      logger.info('\nUsage: data-generator validate --excel <path> [--data <path>] [--run-id <id>]');
      logger.info('\nOptions:');
      logger.info('  --excel, -e <path>    Excel schema file path (required)');
      logger.info('  --data, -d <path>     Data directory path [default: ../output/data]');
      logger.info('  --run-id, -r <id>     Specific run ID to validate');
      logger.info('\nExamples:');
      logger.info('  # Validate all data in directory');
      logger.info('  data-generator validate -e ./schema.xlsx');
      logger.info('\n  # Validate specific run');
      logger.info('  data-generator validate -e ./schema.xlsx --run-id 1762332591572');
      process.exit(1);
    }

    logger.info('📖 Loading Excel schema...');
    const parser = new ExcelParser();
    const schema = await parser.parseExcelFile(path.resolve(excelFile));
    logger.info(`✅ Loaded ${schema.events.length} events, ${schema.properties.length} properties`);

    // Create validator
    const validator = new DataValidator(schema);

    // Determine what to validate
    let targetPath = path.resolve(dataPath);
    if (runId) {
      targetPath = path.join(targetPath, `run_${runId}`);
    }

    if (!fs.existsSync(targetPath)) {
      logger.error(`❌ Path not found: ${targetPath}`);
      process.exit(1);
    }

    // Check if path is a directory or file
    const stat = fs.statSync(targetPath);
    let results: Map<string, any>;

    if (stat.isDirectory()) {
      logger.info(`\n🔍 Validating all JSONL files in: ${targetPath}\n`);
      results = await validator.validateDirectory(targetPath);
    } else if (targetPath.endsWith('.jsonl')) {
      logger.info(`\n🔍 Validating file: ${targetPath}\n`);
      const result = await validator.validateJSONLFile(targetPath);
      results = new Map([[path.basename(targetPath), result]]);
    } else {
      logger.error('❌ Path must be a directory or .jsonl file');
      process.exit(1);
    }

    // Display results
    let totalValid = 0;
    let totalInvalid = 0;

    for (const [file, result] of results) {
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`📄 File: ${file}`);
      logger.info(formatValidationResult(result));

      if (result.isValid) {
        totalValid++;
      } else {
        totalInvalid++;
      }
    }

    // Summary
    logger.info(`\n${'='.repeat(80)}`);
    logger.info('📊 Validation Summary');
    logger.info(`${'='.repeat(80)}`);
    logger.info(`  Total Files: ${results.size}`);
    logger.info(`  ✅ Valid: ${totalValid}`);
    logger.info(`  ❌ Invalid: ${totalInvalid}`);
    logger.info(`${'='.repeat(80)}\n`);

    if (totalInvalid > 0) {
      process.exit(1);
    }

  } catch (error: any) {
    logger.error('❌ Validation Error:', error.message);
    if (process.env.DEBUG) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

async function generateData(args: string[]) {
  try {
    // 필수 인자 파싱
    const excelFile = getArg(args, '--excel', '-e');
    const scenario = getArg(args, '--scenario', '-s');
    const dau = parseInt(getArg(args, '--dau', '-d'));
    const industry = getArg(args, '--industry', '-i');
    const notes = getArg(args, '--notes', '-n') || '';
    const dateStart = getArg(args, '--date-start');
    const dateEnd = getArg(args, '--date-end');

    if (!excelFile || !scenario || !dau || !industry || !dateStart || !dateEnd) {
      logger.error('Missing required arguments');
      printHelp();
      process.exit(1);
    }

    // AI 설정
    const aiProvider = 'anthropic';
    const aiApiKey = process.env.ANTHROPIC_API_KEY || '';

    if (!aiApiKey) {
      logger.error('AI API key not found. Set ANTHROPIC_API_KEY');
      process.exit(1);
    }

    // 출력 경로
    const outputDataPath = path.resolve(getArg(args, '--output-data') || '../output/data');
    const outputMetadataPath = path.resolve(getArg(args, '--output-metadata') || '../output/runs');

    const config: DataGeneratorConfig = {
      excelFilePath: path.resolve(excelFile),
      userInput: {
        scenario,
        dau,
        industry,
        notes,
        dateRange: {
          start: dateStart,
          end: dateEnd
        }
      },
      aiProvider,
      aiApiKey,
      outputDataPath,
      outputMetadataPath
    };

    // LogBus2 설정 (선택사항)
    const appId = getArg(args, '--app-id');
    const receiverUrl = getArg(args, '--receiver-url');
    const logbusPath = getArg(args, '--logbus-path');

    if (appId && receiverUrl && logbusPath) {
      config.logbus = {
        appId,
        receiverUrl,
        logbusPath: path.resolve(logbusPath)
      };
    }

    // 데이터 생성
    const generator = new DataGenerator(config);
    const result = await generator.generate();

    logger.info('\n📊 Generation Summary:');
    logger.info(`  Run ID: ${result.runId}`);
    logger.info(`  Total Users: ${result.totalUsers}`);
    logger.info(`  Total Events: ${result.totalEvents}`);
    logger.info(`  Total Days: ${result.totalDays}`);
    logger.info(`  Files Generated: ${result.filesGenerated.length}`);

    // LogBus2 업로드 (설정된 경우)
    if (config.logbus && args.includes('--upload')) {
      await generator.uploadToLogBus2();
    }

  } catch (error: any) {
    logger.error('❌ Error:', error.message);
    if (process.env.DEBUG) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

function getArg(args: string[], longFlag: string, shortFlag?: string): string {
  const index = args.indexOf(longFlag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }

  if (shortFlag) {
    const shortIndex = args.indexOf(shortFlag);
    if (shortIndex !== -1 && shortIndex + 1 < args.length) {
      return args[shortIndex + 1];
    }
  }

  return '';
}

function printHelp() {
  logger.info(`
ThinkingEngine Data Generator

Commands:
  generate    Generate event data from Excel schema
  validate    Validate generated event data
  upload      Upload data to ThinkingEngine (use LogBus2Controller directly)

Usage:
  data-generator generate [options]
  data-generator validate [options]

GENERATE Command Options:
  Required:
    --excel, -e <path>           Excel schema file path
    --scenario, -s <text>        Scenario description
    --dau, -d <number>           Daily Active Users
    --industry, -i <text>        Service industry
    --date-start <YYYY-MM-DD>    Start date
    --date-end <YYYY-MM-DD>      End date

  Optional:
    --notes, -n <text>           Service characteristics
    --output-data <path>         Output data directory [default: ../output/data]
    --output-metadata <path>     Output metadata directory [default: ../output/runs]

  LogBus2 Options (for upload):
    --app-id <id>                ThinkingEngine APP ID
    --receiver-url <url>         Receiver URL
    --logbus-path <path>         LogBus2 binary path
    --upload                     Upload to ThinkingEngine after generation

VALIDATE Command Options:
  Required:
    --excel, -e <path>           Excel schema file path

  Optional:
    --data, -d <path>            Data directory path [default: ../output/data]
    --run-id, -r <id>            Specific run ID to validate

Environment Variables:
  ANTHROPIC_API_KEY            Anthropic API key (required)

Examples:
  # Generate data
  data-generator generate \\
    -e ./excel-schema-generator/output/schema.xlsx \\
    -s "E-commerce platform with high engagement" \\
    -d 1000 \\
    -i "E-commerce" \\
    --date-start 2025-01-01 \\
    --date-end 2025-01-31

  # Generate and upload
  data-generator generate \\
    -e ./schema.xlsx \\
    -s "Gaming app" \\
    -d 5000 \\
    -i "Gaming" \\
    --date-start 2025-01-01 \\
    --date-end 2025-01-07 \\
    --app-id YOUR_APP_ID \\
    --receiver-url https://te-receiver.thinkingdata.kr/ \\
    --logbus-path "./logbus/logbus" \\
    --upload

  # Validate all data
  data-generator validate -e ./schema.xlsx

  # Validate specific run
  data-generator validate -e ./schema.xlsx --run-id 1762332591572
`);
}

// Run main
main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
