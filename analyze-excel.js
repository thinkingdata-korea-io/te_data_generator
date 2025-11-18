const ExcelJS = require('exceljs');
const path = require('path');

async function analyzeExcel() {
  const filePath = path.join(__dirname, 'excel-schema-generator/output/generated-schemas/KartRider_taxonomy.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log('='.repeat(80));
  console.log('📊 KartRider_taxonomy.xlsx 구조 분석');
  console.log('='.repeat(80));
  console.log();

  workbook.eachSheet((worksheet, sheetId) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📄 시트 ${sheetId}: "${worksheet.name}"`);
    console.log(`${'─'.repeat(80)}`);

    // 헤더 행 가져오기
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers.push(cell.value || `Column${colNumber}`);
    });

    console.log('\n📋 컬럼 구조:');
    headers.forEach((header, index) => {
      console.log(`  ${index + 1}. ${header}`);
    });

    console.log(`\n📊 총 행 수: ${worksheet.rowCount}`);
    console.log(`📊 총 열 수: ${worksheet.columnCount}`);

    // 첫 3개 데이터 행 샘플 출력
    if (worksheet.rowCount > 1) {
      console.log('\n📝 샘플 데이터 (첫 3행):');
      const maxRows = Math.min(4, worksheet.rowCount);
      for (let i = 2; i <= maxRows; i++) {
        const row = worksheet.getRow(i);
        const rowData = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          const value = cell.value;
          if (value === null || value === undefined || value === '') {
            rowData.push('');
          } else if (typeof value === 'object' && value.text) {
            rowData.push(value.text);
          } else {
            rowData.push(String(value).substring(0, 50));
          }
        });
        console.log(`  행 ${i}:`, rowData.join(' | '));
      }
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('분석 완료!');
  console.log('='.repeat(80));
}

analyzeExcel().catch(console.error);
