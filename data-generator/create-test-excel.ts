import * as ExcelJS from 'exceljs';

async function createTestExcel() {
  const workbook = new ExcelJS.Workbook();

  // Events sheet
  const eventsSheet = workbook.addWorksheet('Events');
  eventsSheet.columns = [
    { header: 'event_name', key: 'event_name', width: 20 },
    { header: 'event_name_kr', key: 'event_name_kr', width: 20 },
    { header: 'category', key: 'category', width: 15 },
    { header: 'required_previous_events', key: 'required_previous_events', width: 30 },
    { header: 'user_lifecycle_stage', key: 'user_lifecycle_stage', width: 20 },
    { header: 'trigger_probability', key: 'trigger_probability', width: 15 }
  ];

  eventsSheet.addRows([
    { event_name: 'app_start', event_name_kr: '앱 시작', category: 'system', trigger_probability: 1.0 },
    { event_name: 'app_end', event_name_kr: '앱 종료', category: 'system', trigger_probability: 1.0 },
    { event_name: 'tutorial_start', event_name_kr: '튜토리얼 시작', category: 'interaction', user_lifecycle_stage: 'new', trigger_probability: 0.95 },
    { event_name: 'tutorial_complete', event_name_kr: '튜토리얼 완료', category: 'interaction', required_previous_events: 'tutorial_start', user_lifecycle_stage: 'new', trigger_probability: 0.7 },
    { event_name: 'purchase_complete', event_name_kr: '구매 완료', category: 'transaction', trigger_probability: 0.3 }
  ]);

  // Properties sheet
  const propsSheet = workbook.addWorksheet('Properties');
  propsSheet.columns = [
    { header: 'property_name', key: 'property_name', width: 20 },
    { header: 'property_name_kr', key: 'property_name_kr', width: 20 },
    { header: 'data_type', key: 'data_type', width: 15 },
    { header: 'event_name', key: 'event_name', width: 20 },
    { header: 'description', key: 'description', width: 30 }
  ];

  propsSheet.addRows([
    { property_name: 'product_id', property_name_kr: '상품 ID', data_type: 'string', event_name: 'purchase_complete' },
    { property_name: 'amount', property_name_kr: '금액', data_type: 'number', event_name: 'purchase_complete' },
    { property_name: 'currency', property_name_kr: '통화', data_type: 'string', event_name: 'purchase_complete' }
  ]);

  // Funnels sheet
  const funnelsSheet = workbook.addWorksheet('Funnels');
  funnelsSheet.columns = [
    { header: 'name', key: 'name', width: 20 },
    { header: 'description', key: 'description', width: 30 },
    { header: 'steps', key: 'steps', width: 40 },
    { header: 'conversion_rate', key: 'conversion_rate', width: 15 }
  ];

  funnelsSheet.addRows([
    { name: 'onboarding', description: '온보딩 퍼널', steps: 'tutorial_start,tutorial_complete', conversion_rate: 0.7 }
  ]);

  await workbook.xlsx.writeFile('../excel-schema-generator/output/test_schema.xlsx');
  console.log('✅ Test Excel file created: ../excel-schema-generator/output/test_schema.xlsx');
}

createTestExcel().catch(err => {
  console.error('Error:', err.message);
});
