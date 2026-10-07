function numericSeries(rows=[]){return rows.map(row=>({period:row.period,value:Number(row.value)})).filter(row=>Number.isFinite(row.value));}
function mean(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;}
function stddev(values){if(values.length<2)return 0;const m=mean(values);return Math.sqrt(values.reduce((s,v)=>s+((v-m)**2),0)/(values.length-1));}
function detectAnomaly(rows=[],options={}){
 const series=numericSeries(rows), minimum=Number(options.minimumPoints||6), threshold=Number(options.zThreshold||2.5);
 if(series.length<minimum)return {status:'INSUFFICIENT_HISTORY',anomaly:false,required_points:minimum,points:series.length};
 const current=series[series.length-1], history=series.slice(0,-1).map(x=>x.value), baseline=mean(history), deviation=stddev(history);
 if(deviation===0)return {status:'NO_VARIANCE',anomaly:false,period:current.period,value:current.value,baseline};
 const z=(current.value-baseline)/deviation;
 return {status:'ANALYZED',anomaly:Math.abs(z)>=threshold,direction:z>0?'HIGH':z<0?'LOW':'NORMAL',period:current.period,value:current.value,baseline,deviation,z_score:Number(z.toFixed(4)),threshold,points:series.length};
}
module.exports={numericSeries,mean,stddev,detectAnomaly};

const analytics=require('./analytics.service');

async function analyzeMetric(tenantId,input={}){const metric=String(input.metric||'revenue');const period=String(input.period||'YTD');const result=await analytics.queryMetric(tenantId,{metric,period,dimensions:['month']});return {metric,period,analysis:detectAnomaly(result.data,input),data:result.data};}
module.exports.analyzeMetric=analyzeMetric;
