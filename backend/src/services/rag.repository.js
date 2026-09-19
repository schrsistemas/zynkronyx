const db = require('./db.firebird.service');

async function nextId(tx, generator) {
  const rows = await tx.query('SELECT GEN_ID(' + generator + ', 1) AS ID FROM RDB$DATABASE');
  return Number(rows[0].ID);
}

async function getDocumentByKey(tx, tenantId, externalKey) {
  const rows = await tx.query('SELECT FIRST 1 ID, TENANT_ID, EXTERNAL_KEY, VERSION_NO, CHECKSUM_SHA256, STATUS FROM AI_DOCUMENT WHERE TENANT_ID = ? AND EXTERNAL_KEY = ?', [tenantId, externalKey]);
  return rows[0] || null;
}

async function getJobByIdempotency(tx, tenantId, idempotencyKey) {
  const rows = await tx.query('SELECT FIRST 1 ID, TENANT_ID, DOCUMENT_ID, IDEMPOTENCY_KEY, STATUS, STAGE, ERROR_CODE, ERROR_MESSAGE, CORRELATION_ID, CREATED_AT, STARTED_AT, FINISHED_AT FROM AI_INGESTION_JOB WHERE TENANT_ID = ? AND IDEMPOTENCY_KEY = ?', [tenantId, idempotencyKey]);
  return rows[0] || null;
}

async function createIngestion(input) {
  const { tenantId, sourceType, externalKey, title, checksum, classification, aclJson, metadataJson, correlationId, idempotencyKey, chunks } = input;
  return db.withTransaction(async (tx) => {
    const existingJob = await getJobByIdempotency(tx, tenantId, idempotencyKey);
    if (existingJob) return { created: false, idempotent: true, documentId: existingJob.DOCUMENT_ID, job: existingJob };

    const existingDocument = await getDocumentByKey(tx, tenantId, externalKey);
    let documentId;
    let versionNo = 1;

    if (existingDocument && existingDocument.CHECKSUM_SHA256 === checksum && existingDocument.STATUS === 'ACTIVE') {
      documentId = Number(existingDocument.ID);
      versionNo = Number(existingDocument.VERSION_NO);
    } else {
      documentId = existingDocument ? Number(existingDocument.ID) : await nextId(tx, 'GEN_AI_DOCUMENT_ID');
      versionNo = existingDocument ? Number(existingDocument.VERSION_NO) + 1 : 1;

      if (existingDocument) {
        await tx.execute('UPDATE AI_DOCUMENT SET VERSION_NO = ?, CHECKSUM_SHA256 = ?, TITLE = ?, CLASSIFICATION = ?, ACL_JSON = ?, METADATA_JSON = ?, STATUS = ?, UPDATED_AT = CURRENT_TIMESTAMP, DELETED_AT = NULL WHERE ID = ? AND TENANT_ID = ?', [versionNo, checksum, title || null, classification, aclJson, metadataJson, 'ACTIVE', documentId, tenantId]);
        await tx.execute('DELETE FROM AI_DOCUMENT_CHUNK WHERE DOCUMENT_ID = ? AND TENANT_ID = ?', [documentId, tenantId]);
      } else {
        await tx.execute('INSERT INTO AI_DOCUMENT (ID, TENANT_ID, SOURCE_TYPE, EXTERNAL_KEY, TITLE, VERSION_NO, CHECKSUM_SHA256, CLASSIFICATION, ACL_JSON, STATUS, METADATA_JSON) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [documentId, tenantId, sourceType, externalKey, title || null, versionNo, checksum, classification, aclJson, 'ACTIVE', metadataJson]);
      }
    }

    const jobId = await nextId(tx, 'GEN_AI_INGESTION_JOB_ID');
    for (const chunk of chunks) {
      const chunkId = await nextId(tx, 'GEN_AI_DOCUMENT_CHUNK_ID');
      await tx.execute('INSERT INTO AI_DOCUMENT_CHUNK (ID, TENANT_ID, DOCUMENT_ID, CHUNK_INDEX, CONTENT, CONTENT_HASH, TOKEN_COUNT, VECTOR_KEY, EMBEDDING_MODEL, STATUS) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [chunkId, tenantId, documentId, chunk.index, chunk.content, chunk.hash, chunk.tokenCount, null, null, 'PENDING']);
    }

    await tx.execute('INSERT INTO AI_INGESTION_JOB (ID, TENANT_ID, DOCUMENT_ID, IDEMPOTENCY_KEY, STATUS, STAGE, CORRELATION_ID) VALUES (?, ?, ?, ?, ?, ?, ?)', [jobId, tenantId, documentId, idempotencyKey, 'QUEUED', 'CHUNKED', correlationId || null]);

    return { created: true, idempotent: false, documentId, versionNo, chunkCount: chunks.length, jobId, status: 'QUEUED', stage: 'CHUNKED' };
  });
}

module.exports = { createIngestion, getDocumentByKey, getJobByIdempotency };
