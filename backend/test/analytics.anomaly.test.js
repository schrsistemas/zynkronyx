const assert=require('node:assert/strict');
const test=require('node:test');
const {detectAnomaly,mean,stddev}=require('../src/analytics/anomaly.service');

test('anomaly detector requires enough historical points',()=>{const r=detectAnomaly([{value:1},{value:2},{value:3}]);assert.equal(r.status,'INSUFFICIENT_HISTORY');assert.equal(r.anomaly,false);});
test('anomaly detector identifies high deviation from historical baseline',()=>{const rows=[10,11,9,10,11,20].map((value,i)=>({period:String(i),value}));const r=detectAnomaly(rows,{minimumPoints:6,zThreshold:2.5});assert.equal(r.status,'ANALYZED');assert.equal(r.anomaly,true);assert.equal(r.direction,'HIGH');});
test('anomaly detector identifies low deviation from historical baseline',()=>{const rows=[100,102,98,101,99,70].map((value,i)=>({period:String(i),value}));const r=detectAnomaly(rows,{minimumPoints:6,zThreshold:2.5});assert.equal(r.anomaly,true);assert.equal(r.direction,'LOW');});
test('zero variance does not create infinite z score',()=>{const r=detectAnomaly([10,10,10,10,10,10].map((value,i)=>({period:String(i),value})));assert.equal(r.status,'NO_VARIANCE');assert.equal(r.anomaly,false);});
