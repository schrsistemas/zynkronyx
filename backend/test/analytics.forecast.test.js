const test=require('node:test');
const assert=require('node:assert/strict');
const {forecastSeries,linearRegression,addMonths}=require('../src/analytics/forecast.service');

test('linear regression estimates a deterministic upward trend',()=>{
 const model=linearRegression([1,3,5,7,9,11].map(value=>({value})));
 assert.equal(Number(model.slope.toFixed(6)),2);
 assert.equal(Number(model.intercept.toFixed(6)),1);
 assert.equal(Number(model.r2.toFixed(6)),1);
});

test('forecast requires minimum history',()=>{
 const result=forecastSeries([{period:'2026-01',value:10},{period:'2026-02',value:11}],{minimumPoints:6,horizon:3});
 assert.equal(result.status,'INSUFFICIENT_HISTORY');
 assert.equal(result.points,2);
 assert.equal(result.forecast.length,0);
});

test('forecast generates bounded future monthly points',()=>{
 const rows=Array.from({length:6},(_,i)=>({period:addMonths('2026-01',i),value:100+(i*10)}));
 const result=forecastSeries(rows,{horizon:3});
 assert.equal(result.status,'FORECASTED');
 assert.deepEqual(result.forecast.map(x=>x.period),['2026-07','2026-08','2026-09']);
 assert.deepEqual(result.forecast.map(x=>x.value),[160,170,180]);
 assert.equal(result.uncertainty.prediction_interval,null);
});

test('forecast does not emit negative business values',()=>{
 const rows=Array.from({length:6},(_,i)=>({period:addMonths('2026-01',i),value:10-(i*2)}));
 const result=forecastSeries(rows,{horizon:3});
 assert.equal(result.status,'FORECASTED');
 assert.ok(result.forecast.every(x=>x.value>=0));
 assert.ok(result.forecast.some(x=>x.raw_value<0));
});
