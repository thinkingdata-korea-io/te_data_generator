const ExcelJS = require('exceljs');
const path = require('path');

async function verify() {
  const filePath = path.join(__dirname, 'output/test/레이싱_게임_taxonomy.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log('=' .repeat(80));
  console.log('📊 생성된 Excel 파일 검증');
  console.log('='.repeat(80));
  console.log();

  const expectedSheets = [
    '#유저 ID 체계',
    '#이벤트 데이터',
    '#공통 이벤트 속성',
    '#유저 데이터'
  ];

  const expectedColumns = {
    '#유저 ID 체계': ['유형', '속성 이름', '속성 별칭', '속성 설명', '값 설명'],
    '#이벤트 데이터': ['이벤트 이름', '이벤트 별칭', '이벤트 설명', '이벤트 태그', '속성 이름', '속성 별칭', '속성 유형', '속성 설명'],
    '#공통 이벤트 속성': ['속성 이름', '속성 별칭', '속성 유형', '속성 설명'],
    '#유저 데이터': ['속성 이름', '속성 별칭', '속성 유형', '업데이트 방식', '속성 설명', '속성 태그']
  };

  let allValid = true;

  expectedSheets.forEach((sheetName, index) => {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      console.log(`❌ 시트 "${sheetName}" 누락!`);
      allValid = false;
      return;
    }

    console.log(`✅ 시트 ${index + 1}: ${sheetName}`);

    // Check header row
    const headerRow = sheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell) => headers.push(cell.value));

    const expected = expectedColumns[sheetName];
    const headersMatch = JSON.stringify(headers) === JSON.stringify(expected);

    if (headersMatch) {
      console.log(`   ✓ 컬럼 구조 일치: ${headers.join(' | ')}`);
    } else {
      console.log(`   ❌ 컬럼 구조 불일치!`);
      console.log(`      예상: ${expected.join(' | ')}`);
      console.log(`      실제: ${headers.join(' | ')}`);
      allValid = false;
    }

    console.log(`   데이터 행 수: ${sheet.rowCount - 1}개`);

    // Show sample data
    if (sheet.rowCount > 1) {
      const row2 = sheet.getRow(2);
      const sample = [];
      row2.eachCell((cell) => {
        const val = cell.value;
        if (val && typeof val === 'string' && val.length > 30) {
          sample.push(val.substring(0, 30) + '...');
        } else {
          sample.push(val || '');
        }
      });
      console.log(`   샘플: ${sample.slice(0, 3).join(' | ')}`);
    }
    console.log();
  });

  console.log('='.repeat(80));
  if (allValid) {
    console.log('✅ 모든 검증 통과! Excel 파일이 올바르게 생성되었습니다.');
  } else {
    console.log('❌ 일부 검증 실패. 구조를 확인하세요.');
  }
  console.log('='.repeat(80));
}

verify().catch(console.error);
