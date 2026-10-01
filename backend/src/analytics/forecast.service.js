const catalog=require('./metric.catalog');
const analytics=require('./analytics.service');

function numericSeries(rows=[]){
 return rows.map(row=>({period:String(row.period),value:Number(row.value)})).filter(row=>/^\d{4}-\d{2}$/.test(row.period)&&Number.isFinite(row.value));
}
function mean(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;}
function linearRegression(series){
 const n=series.length;
 const xs=series.map((_,i)=>i);
 const ys=series.map(row=>row.value);
 const xBar=mean(xs),yBar=mean(ys);
 const denominator=xs.reduce((s,x)=>s+((x-xBar)**2),0);
 if(denominator===0)return null;
 const slope=xs.reduce((s,x,i)=>s+((x-xBar)*(ys[i]-yBar)),0)/denominator;
 const intercept=yBar-slope*xBar;
 const fitted=xs.map(x=>intercept+slope*x);
 const residuals=ys.map((y,i)=>y-fitted[i]);
 const residualStdError=n>2?Math.sqrt(residuals.reduce((s,e)=>s+(e*e),0)/(n-2)):0;
 const ssTot=ys.reduce((s,y)=>s+((y-yBar)**2),0);
 const ssRes=residuals.reduce((s,e)=>s+(e*e),0);
 const r2=ssTot===0?1:1-(ssRes/ssTot);
 return {intercept,slope,residualStdError,r2};
}
function addMonths(period,months){
 const [year,month]=period.split('-').map(Number);
 const date=new Date(Date.UTC(year,month-1+months,1));
 return date.getUTCFullYear()+'-'+String(date.getUTCMonth()+1).padStart(2,'0');
}
function forecastSeries(rows=[],options={}){
 const series=numericSeries(rows);
 const minimum=Math.max(Number(options.minimumPoints||6),3);
 const horizon=Math.min(Math.max(Number(options.horizon||3),1),12);
 if(series.length<minimum)return {status:'INSUFFICIENT_HISTORY',forecast:[],required_points:minimum,points:series.length,horizon};
 const model=linearRegression(series);
 if(!model)return {status:'MODEL_UNAVAILABLE',forecast:[],required_points:minimum,points:series.length,horizon};
 const lastIndex=series.length-1;
 const forecast=Array.from({length:horizon},(_,i)=>{
   const raw=model.intercept+model.slope*(lastIndex+i+1);
   const value=Math.max(0,raw);
   return {period:addMonths(series[series.length-1].period,i+1),value:Number(value.toFixed(4)),raw_value:Number(raw.toFixed(4))};
 });
 return {
   status:'FORECASTED',
   forecast,
   history:series,
   points:series.length,
   horizon,
   model:{kind:'LINEAR_TREND_OLS',intercept:Number(model.intercept.toFixed(8)),slope:Number(model.slope.toFixed(8)),r2:Number(model.r2.toFixed(6)),residual_std_error:Number(model.residualStdError.toFixed(6))},
   uncertainty:{prediction_interval:null,reason:'V1 does not expose an interval without a validated time-series error model.'},
   limitations:['Trend extrapolation only','Does not model seasonality, autocorrelation, promotions, price changes or external drivers','Forecast values are constrained to non-negative domain']
 };
}
async function forecastMetric(tenantId,input={}){
 const metricName=String(input.metric||'revenue');
 const metric=catalog.getMetric(metricName);
 if(!metric){const error=new Error('ANALYTICS_METRIC_NOT_FOUND');error.code=error.message;error.status=404;throw error;}
 const period=String(input.period||'YTD');
 const result=await analytics.queryMetric(tenantId,{metric:metricName,period,dimensions:['month']});
 return {metric:metricName,label:metric.label,period:result.period,analysis:forecastSeries(result.data,input)};
}
module.exports={numericSeries,mean,linearRegression,addMonths,forecastSeries,forecastMetric};
