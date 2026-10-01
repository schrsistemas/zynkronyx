const CONTRACTS=Object.freeze({
  analytics_query:{
    version:'1.0.0', sideEffect:'READ_ONLY', tenantRequired:true, auditRequired:true,
    timeoutMs:5000, idempotency:'NOT_REQUIRED',
    inputSchema:{type:'object',required:['metric','period'],properties:{metric:{type:'string',minLength:1,maxLength:120},period:{type:'string',minLength:1,maxLength:40},dimensions:{type:'array',maxItems:10,items:{type:'string',maxLength:80}}}},
    outputSchema:{type:'object'}
  },
  analytics_forecast:{
    version:'1.0.0', sideEffect:'READ_ONLY', tenantRequired:true, auditRequired:true,
    timeoutMs:5000, idempotency:'NOT_REQUIRED',
    inputSchema:{type:'object',required:['metric'],properties:{metric:{type:'string',minLength:1,maxLength:120},period:{type:'string',maxLength:40},horizon:{type:'integer',minimum:1,maximum:12}}},
    outputSchema:{type:'object'}
  },
  analytics_anomaly:{
    version:'1.0.0', sideEffect:'READ_ONLY', tenantRequired:true, auditRequired:true,
    timeoutMs:5000, idempotency:'NOT_REQUIRED',
    inputSchema:{type:'object',required:['metric'],properties:{metric:{type:'string',minLength:1,maxLength:120},period:{type:'string',maxLength:40},zThreshold:{type:'number',minimum:0}}},
    outputSchema:{type:'object'}
  },
  analytics_insight:{
    version:'1.0.0', sideEffect:'READ_ONLY', tenantRequired:true, auditRequired:true,
    timeoutMs:5000, idempotency:'NOT_REQUIRED',
    inputSchema:{type:'object',required:['insight_id'],properties:{insight_id:{type:'integer',minimum:1}}},
    outputSchema:{type:'object'}
  }
});

function fail(code,status=400){const e=new Error(code);e.code=code;e.status=status;throw e;}
function validatePrimitive(value,spec,path){
  if(spec.type==='string'){if(typeof value!=='string'||(spec.minLength!=null&&value.trim().length<spec.minLength)||(spec.maxLength!=null&&value.length>spec.maxLength))fail('MCP_INVALID_ARGUMENT:'+path);}
  else if(spec.type==='integer'){if(!Number.isInteger(value)||(spec.minimum!=null&&value<spec.minimum)||(spec.maximum!=null&&value>spec.maximum))fail('MCP_INVALID_ARGUMENT:'+path);}
  else if(spec.type==='number'){if(typeof value!=='number'||!Number.isFinite(value)||(spec.minimum!=null&&value<spec.minimum))fail('MCP_INVALID_ARGUMENT:'+path);}
}
function validateArgs(name,args={}){
 const c=CONTRACTS[name];if(!c)fail('MCP_TOOL_CONTRACT_NOT_FOUND',404);
 if(args==null||typeof args!=='object'||Array.isArray(args))fail('MCP_INVALID_ARGUMENTS');
 for(const key of c.inputSchema.required||[])if(args[key]===undefined||args[key]===null)fail('MCP_REQUIRED_ARGUMENT:'+key);
 for(const [key,spec] of Object.entries(c.inputSchema.properties||{})){if(args[key]!==undefined){if(spec.type==='array'){if(!Array.isArray(args[key])||(spec.maxItems!=null&&args[key].length>spec.maxItems))fail('MCP_INVALID_ARGUMENT:'+key);for(const item of args[key])validatePrimitive(item,spec.items,key);}else validatePrimitive(args[key],spec,key);}}
 return args;
}
function getContract(name){return CONTRACTS[name]||null;}
function listContracts(){return Object.entries(CONTRACTS).map(([name,c])=>({name,...c}));}
module.exports={CONTRACTS,getContract,listContracts,validateArgs};
