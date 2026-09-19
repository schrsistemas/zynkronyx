const { createProvider } = require('./ai.provider');
const rag = require('./rag.service');

const config = {
  enabled: () => String(process.env.AI_ENABLED || '').toLowerCase() === 'true',
  ragEnabled: () => String(process.env.RAG_ENABLED || '').toLowerCase() === 'true',
  provider: () => process.env.AI_PROVIDER || null,
  model: () => process.env.AI_MODEL || null,
  embeddingModel: () => process.env.AI_EMBEDDING_MODEL || null,
  promptVersion: () => process.env.AI_PROMPT_VERSION || 'v1',
  topK: () => Math.min(Math.max(Number(process.env.RAG_TOP_K || 8),1),50)
};

function status(req) {
  return {
    enabled: config.enabled(), provider: config.provider(), model: config.model(),
    promptVersion: config.promptVersion(), tenantScoped: Boolean(req?.tenant?.id),
    rag: { enabled: config.ragEnabled(), embeddingModel: config.embeddingModel(), topK: config.topK(), sourceOfTruth:'firebird', vectorIndex:'derived' },
    safeguards: { tenantIsolation:Boolean(req?.tenant?.id), sqlGeneration:false, mutableActionsRequireAuthorization:true, auditRequired:true }
  };
}

async function query(input, req) {
  if (!req?.tenant?.id) { const e=new Error('TENANT_CONTEXT_REQUIRED'); e.status=401; throw e; }
  if (!config.enabled()) { const e=new Error('AI_NOT_CONFIGURED'); e.status=503; throw e; }
  const provider=createProvider(config.provider());
  if (!provider) { const e=new Error('AI_PROVIDER_NOT_CONFIGURED'); e.status=503; throw e; }
  const retrieval=config.ragEnabled()?await rag.retrieve(req,input):{results:[]};
  const generated=await provider.generate({model:config.model(),input,retrieval,tenantId:req.tenant.id,correlationId:req.correlationId});
  return {generated,retrieval,prompt_version:config.promptVersion()};
}
module.exports={config,status,query,rag};
