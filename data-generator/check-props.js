const { ExcelParser } = require('./dist/excel/parser');
const parser = new ExcelParser();
parser.parseExcelFile('../excel-schema-generator/output/generated-schemas/게임_taxonomy.xlsx').then(schema => {
  const eventProps = schema.properties.filter(p => p.event_name);
  const commonProps = schema.properties.filter(p => !p.event_name);
  
  console.log('📊 Statistics:');
  console.log('Events:', schema.events.length);
  console.log('Event properties (with event_name):', eventProps.length);
  console.log('Common properties (no event_name):', commonProps.length);
  console.log('');
  
  // 중복 체크
  const uniqueKeys = new Set();
  const duplicates = [];
  eventProps.forEach(p => {
    const key = `${p.event_name}:${p.property_name}`;
    if (uniqueKeys.has(key)) {
      duplicates.push(key);
    }
    uniqueKeys.add(key);
  });
  
  console.log('Unique event properties:', uniqueKeys.size);
  console.log('Duplicates found:', duplicates.length);
  if (duplicates.length > 0) {
    console.log('Sample duplicates:', duplicates.slice(0, 5));
  }
  
  // 이벤트별 속성 개수
  const propsPerEvent = {};
  eventProps.forEach(p => {
    propsPerEvent[p.event_name] = (propsPerEvent[p.event_name] || 0) + 1;
  });
  
  const eventList = Object.entries(propsPerEvent).sort((a,b) => b[1] - a[1]);
  console.log('');
  console.log('Properties per event (top 5):');
  eventList.slice(0, 5).forEach(([event, count]) => {
    console.log(`  ${event}: ${count} properties`);
  });
  
  console.log('');
  console.log('Average properties per event:', (eventProps.length / schema.events.length).toFixed(1));
}).catch(console.error);
