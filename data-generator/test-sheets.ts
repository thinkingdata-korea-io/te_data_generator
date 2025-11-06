import * as XLSX from 'xlsx';

const workbook = XLSX.readFile('../excel-schema-generator/output/generated-schemas/KartRider_taxonomy.xlsx');

console.log('Sheet names:');
console.log(workbook.SheetNames);
