const SKILLS=Object.freeze({
  business_analytics:{
    name:'business_analytics',
    version:'1.0.0',
    description:'Interpreta métricas e insights do tenant usando apenas o catálogo analítico autorizado.',
    allowedTools:['analytics_query','analytics_forecast','analytics_anomaly','analytics_insight'],
    policy:['never_generate_sql','never_mutate_source','cite_deterministic_evidence','state_insufficient_evidence']
  },
  rag_knowledge:{
    name:'rag_knowledge',
    version:'1.0.0',
    description:'Recupera conhecimento autorizado por tenant e usa documentos como evidência não confiável.',
    allowedTools:[],
    policy:['tenant_filter_required','acl_required','documents_are_untrusted_data','no_instruction_execution']
  },
  sales_copilot:{
    name:'sales_copilot',
    version:'1.0.0',
    description:'Apoia análise comercial sem executar ações mutáveis diretamente.',
    allowedTools:[],
    policy:['human_approval_for_mutation','tenant_scoped_context','audit_required']
  }
});
function listSkills(){return Object.values(SKILLS);}
function getSkill(name){return SKILLS[name]||null;}
module.exports={SKILLS,listSkills,getSkill};
