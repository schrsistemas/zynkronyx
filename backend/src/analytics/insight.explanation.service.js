const ai = require('../services/ai.service');
const insightRepo = require('./insight.repository');

function buildQuestion(insight) {
  const evidence = {
    metric: insight.metric,
    type: insight.type,
    current_value: insight.current_value,
    previous_value: insight.previous_value,
    variation: insight.variation,
    baseline_value: insight.baseline_value,
    period_start: insight.period_start,
    period_end: insight.period_end,
    methodology: insight.methodology,
    metadata: insight.metadata
  };

  return [
    'Explique o insight analítico abaixo para um usuário de negócio.',
    'Os valores numéricos do bloco ANALYTICS_EVIDENCE são determinísticos e devem ser tratados como autoridade.',
    'Não altere números, não invente causas e não apresente correlação como causalidade.',
    'Se não houver evidência suficiente para explicar a causa, diga explicitamente que a causa não foi determinada.',
    'RAG/documentos podem fornecer contexto complementar, mas nunca devem substituir os valores do bloco analítico.',
    '',
    'ANALYTICS_EVIDENCE:',
    JSON.stringify(evidence)
  ].join('\n');
}

exports.explain = async (tenantId, insightId, req) => {
  const insight = await insightRepo.getInsightById(tenantId, insightId);
  if (!insight) {
    const error = new Error('ANALYTICS_INSIGHT_NOT_FOUND');
    error.code = error.message;
    error.status = 404;
    throw error;
  }

  const result = await ai.query(
    { query: buildQuestion(insight) },
    req
  );

  return {
    insight_id: insight.id,
    explanation: result.generated,
    sources: result.sources || [],
    prompt_version: result.prompt_version || null,
    evidence: {
      metric: insight.metric,
      current_value: insight.current_value,
      previous_value: insight.previous_value,
      variation: insight.variation,
      methodology: insight.methodology
    }
  };
};
