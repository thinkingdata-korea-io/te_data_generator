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
      console.log('Upload command - use LogBus2Controller directly');
      break;

    default:
      console.error(`Unknown command: ${command}`);
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
      console.error('❌ Excel schema file required');
      console.log('\nUsage: data-generator validate --excel <path> [--data <path>] [--run-id <id>]');
      console.log('\nOptions:');
      console.log('  --excel, -e <path>    Excel schema file path (required)');
      console.log('  --data, -d <path>     Data directory path [default: ../output/data]');
      console.log('  --run-id, -r <id>     Specific run ID to validate');
      console.log('\nExamples:');
      console.log('  # Validate all data in directory');
      console.log('  data-generator validate -e ./schema.xlsx');
      console.log('\n  # Validate specific run');
      console.log('  data-generator validate -e ./schema.xlsx --run-id 1762332591572');
      process.exit(1);
    }

    console.log('📖 Loading Excel schema...');
    const parser = new ExcelParser();
    const schema = await parser.parseExcelFile(path.resolve(excelFile));
    console.log(`✅ Loaded ${schema.events.length} events, ${schema.properties.length} properties`);

    // Create validator
    const validator = new DataValidator(schema);

    // Determine what to validate
    let targetPath = path.resolve(dataPath);
    if (runId) {
      targetPath = path.join(targetPath, `run_${runId}`);
    }

    if (!fs.existsSync(targetPath)) {
      console.error(`❌ Path not found: ${targetPath}`);
      process.exit(1);
    }

    // Check if path is a directory or file
    const stat = fs.statSync(targetPath);
    let results: Map<string, any>;

    if (stat.isDirectory()) {
      console.log(`\n🔍 Validating all JSONL files in: ${targetPath}\n`);
      results = await validator.validateDirectory(targetPath);
    } else if (targetPath.endsWith('.jsonl')) {
      console.log(`\n🔍 Validating file: ${targetPath}\n`);
      const result = await validator.validateJSONLFile(targetPath);
      results = new Map([[path.basename(targetPath), result]]);
    } else {
      console.error('❌ Path must be a directory or .jsonl file');
      process.exit(1);
    }

    // Display results
    let totalValid = 0;
    let totalInvalid = 0;

    for (const [file, result] of results) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📄 File: ${file}`);
      console.log(formatValidationResult(result));

      if (result.isValid) {
        totalValid++;
      } else {
        totalInvalid++;
      }
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 Validation Summary');
    console.log(`${'='.repeat(80)}`);
    console.log(`  Total Files: ${results.size}`);
    console.log(`  ✅ Valid: ${totalValid}`);
    console.log(`  ❌ Invalid: ${totalInvalid}`);
    console.log(`${'='.repeat(80)}\n`);

    if (totalInvalid > 0) {
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Validation Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
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
      console.error('Missing required arguments');
      printHelp();
      process.exit(1);
    }

    // AI 설정
    const aiProvider = (getArg(args, '--ai-provider') || 'openai') as 'openai' | 'anthropic';
    const aiApiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '';

    if (!aiApiKey) {
      console.error('AI API key not found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY');
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

    console.log('\n📊 Generation Summary:');
    console.log(`  Run ID: ${result.runId}`);
    console.log(`  Total Users: ${result.totalUsers}`);
    console.log(`  Total Events: ${result.totalEvents}`);
    console.log(`  Total Days: ${result.totalDays}`);
    console.log(`  Files Generated: ${result.filesGenerated.length}`);

    // LogBus2 업로드 (설정된 경우)
    if (config.logbus && args.includes('--upload')) {
      await generator.uploadToLogBus2();
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
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
  console.log(`
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
    --ai-provider <provider>     AI provider (openai|anthropic) [default: openai]
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
  ANTHROPIC_API_KEY            Anthropic API key
  OPENAI_API_KEY               OpenAI API key

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
    --logbus-path "./logbus 2/logbus" \\
    --upload

  # Validate all data
  data-generator validate -e ./schema.xlsx

  # Validate specific run
  data-generator validate -e ./schema.xlsx --run-id 1762332591572
`);
}

// Run main
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
