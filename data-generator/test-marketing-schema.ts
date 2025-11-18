import { ExcelParser } from './src/excel/parser';
import { MARKETING_SCHEMA } from './src/schemas/marketing-schema';
import path from 'path';

/**
 * 마케팅 스키마 통합 테스트
 */
async function testMarketingSchema() {
  console.log('🧪 Marketing Schema Integration Test\n');

  // 1. 고정 스키마 확인
  console.log('📋 Fixed Marketing Schema:');
  console.log(`  - Events: ${MARKETING_SCHEMA.events.length}`);
  console.log(`  - Event Properties: ${MARKETING_SCHEMA.eventProperties.length}`);
  console.log(`  - User Properties: ${MARKETING_SCHEMA.userProperties.length}`);
  console.log('');

  MARKETING_SCHEMA.events.forEach(event => {
    console.log(`  ✓ ${event.event_name} (${event.event_name_kr})`);
  });
  console.log('');

  // 2. Excel 파싱 + 마케팅 스키마 병합 테스트
  const excelPath = path.join(__dirname, '../excel-schema-generator/output/test/레이싱_게임_taxonomy.xlsx');

  try {
    console.log(`📂 Loading Excel: ${excelPath}`);
    const parser = new ExcelParser();
    const schema = await parser.parseExcelFile(excelPath);

    console.log('\n✅ Merged Schema:');
    console.log(`  - Total Events: ${schema.events.length}`);
    console.log(`  - Total Properties: ${schema.properties.length}`);
    console.log(`  - Total Funnels: ${schema.funnels.length}`);
    console.log('');

    // 마케팅 이벤트 확인
    const marketingEvents = schema.events.filter(e =>
      e.event_name === 'install' || e.event_name === 'adjust_ad_revenue'
    );

    console.log('🎯 Marketing Events Found:');
    marketingEvents.forEach(event => {
      console.log(`  ✓ ${event.event_name} (${event.event_name_kr}) - ${event.category}`);
    });

    if (marketingEvents.length === 2) {
      console.log('\n✅ Marketing schema successfully merged!');
    } else {
      console.error('\n❌ Marketing events not found in merged schema!');
      process.exit(1);
    }

    // install 이벤트의 속성 확인
    const installProps = schema.properties.filter(p => p.event_name === 'install');
    console.log(`\n📊 install event properties: ${installProps.length}`);
    console.log('Sample properties:');
    installProps.slice(0, 5).forEach(prop => {
      console.log(`  - ${prop.property_name} (${prop.data_type})`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }

  console.log('\n🎉 All tests passed!');
}

testMarketingSchema();
