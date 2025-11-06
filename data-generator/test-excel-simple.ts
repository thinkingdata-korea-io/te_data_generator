import * as ExcelJS from 'exceljs';

async function testSimple() {
  const workbook = new ExcelJS.Workbook();

  try {
    console.log('Attempting to load Excel file...');

    // Try with minimal parsing
    const buffer = require('fs').readFileSync('../excel-schema-generator/output/generated-schemas/KartRider_taxonomy.xlsx');
    await workbook.xlsx.load(buffer);

    console.log('✅ File loaded successfully!');
    console.log('Worksheets:');
    workbook.eachSheet((worksheet, sheetId) => {
      console.log(`  - ${worksheet.name} (ID: ${sheetId})`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSimple();
