const db = require('../services/db.service');

async function nextId(resource,executor=db){ return executor.nextId(resource); }

exports.listMappings = async tenantId => db.query(
  'SELECT ID,ENTITY_NAME,FIELD_NAME,SOURCE_TYPE,SOURCE_NAME,SOURCE_FIELD,DATA_TYPE,STATUS,ISOLATION_MODE,TENANT_FIELD,TENANT_VALUE,METADATA,CREATED_AT,UPDATED_AT FROM ANALYTICS_MAPPING WHERE TENANT_ID=? ORDER BY ENTITY_NAME,FIELD_NAME',
  [tenantId]
);

exports.getMapping = async (tenantId, entityName, fieldName, executor=db) => {
  const rows = await executor.query(
    'SELECT ID,ENTITY_NAME,FIELD_NAME,SOURCE_TYPE,SOURCE_NAME,SOURCE_FIELD,DATA_TYPE,STATUS,ISOLATION_MODE,TENANT_FIELD,TENANT_VALUE,METADATA,CREATED_AT,UPDATED_AT FROM ANALYTICS_MAPPING WHERE TENANT_ID=? AND ENTITY_NAME=? AND FIELD_NAME=?',
    [tenantId, entityName, fieldName]
  );
  return rows[0] || null;
};

exports.upsertMapping = async (input,executor=db) => {
  const existing = await exports.getMapping(input.tenantId, input.entityName, input.fieldName, executor);
  if (existing) {
    await executor.execute(
      'UPDATE ANALYTICS_MAPPING SET SOURCE_TYPE=?,SOURCE_NAME=?,SOURCE_FIELD=?,DATA_TYPE=?,STATUS=?,ISOLATION_MODE=?,TENANT_FIELD=?,TENANT_VALUE=?,METADATA=?,UPDATED_AT=' + db.dialect().currentTimestamp + ' WHERE TENANT_ID=? AND ENTITY_NAME=? AND FIELD_NAME=?',
      [
        input.sourceType,input.sourceName,input.sourceField,input.dataType,input.status,
        input.isolationMode,input.tenantField||null,input.tenantValue==null?null:String(input.tenantValue),
        JSON.stringify(input.metadata || {}),
        input.tenantId,input.entityName,input.fieldName
      ]
    );
    return exports.getMapping(input.tenantId, input.entityName, input.fieldName, executor);
  }

  const id = await nextId('ANALYTICS_MAPPING',executor);
  await executor.execute(
    'INSERT INTO ANALYTICS_MAPPING (ID,TENANT_ID,ENTITY_NAME,FIELD_NAME,SOURCE_TYPE,SOURCE_NAME,SOURCE_FIELD,DATA_TYPE,STATUS,ISOLATION_MODE,TENANT_FIELD,TENANT_VALUE,METADATA) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      id,input.tenantId,input.entityName,input.fieldName,input.sourceType,input.sourceName,input.sourceField,
      input.dataType,input.status,input.isolationMode,input.tenantField||null,input.tenantValue==null?null:String(input.tenantValue),
      JSON.stringify(input.metadata || {})
    ]
  );
  return exports.getMapping(input.tenantId, input.entityName, input.fieldName, executor);
};

exports.deleteMapping = async (tenantId, entityName, fieldName, executor=db) => executor.execute(
  'DELETE FROM ANALYTICS_MAPPING WHERE TENANT_ID=? AND ENTITY_NAME=? AND FIELD_NAME=?',
  [tenantId, entityName, fieldName]
);

exports.getMappingsForMetric = async (tenantId, metric) => {
  const required = metric.requiredFields || [];
  const result = {};
  for (const field of required) result[field] = await exports.getMapping(tenantId, metric.entity, field);
  return result;
};

exports.getMappingByEntityField = exports.getMapping;
