import { ExcelParser } from './src/excel/parser';

async function test() {
  const parser = new ExcelParser();
  const schema = await parser.parseExcelFile('../excel-schema-generator/output/generated-schemas/예시 - 방치형 게임.xlsx');

  console.log('✅ Excel parsed successfully!');
  console.log(`Events: ${schema.events.length}`);
  console.log(`Properties: ${schema.properties.length}`);
  console.log(`Funnels: ${schema.funnels.length}`);

  console.log('\nFirst 3 events:');
  schema.events.slice(0, 3).forEach(e => {
    console.log(`- ${e.event_name} (${e.event_name_kr})`);
  });
}

test().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
});
