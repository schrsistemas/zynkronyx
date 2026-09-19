const db = require('./db.service');

async function nextId(tx, resource) {
  return tx.nextId(resource);
}

async function getDocumentByKey(tx, tenantId, externalKey) {
  const rows = await tx.query(
    'SELECT ID,TENANT_ID,EXTERNAL_KEY,VERSION_NO,CHECKSUM_SHA256,STATUS FROM AI_DOCUMENT WHERE TENANT_ID=? AND EXTERNAL_KEY=?',
    [tenantId, externalKey]
  );
  return rows[0] || null;
}

async function getJobByIdempotency(tx, tenantId, key) {
  const rows = await tx.query(
    'SELECT ID,TENANT_ID,DOCUMENT_ID,IDEMPOTENCY_KEY,STATUS,STAGE,ERROR_CODE,ERROR_MESSAGE,CORRELATION_ID,CREATED_AT,STARTED_AT,FINISHED_AT FROM AI_INGESTION_JOB WHERE TENANT_ID=? AND IDEMPOTENCY_KEY=?',
    [tenantId, key]
  );
  return rows[0] || null;
}

async function claimNextJob() {
  return db.withTransaction(async (tx) => {
    const dialect = db.dialect();
    const sql = dialect.lock(dialect.limit(
      "SELECT ID,TENANT_ID,DOCUMENT_ID,IDEMPOTENCY_KEY,STATUS,STAGE,CORRELATION_ID FROM AI_INGESTION_JOB WHERE STATUS='QUEUED' ORDER BY ID",
      1
    ));
    const rows = await tx.query(sql);
    const job = rows[0];
    if (!job) return null;
    await tx.execute(
      "UPDATE AI_INGESTION_JOB SET STATUS='RUNNING',STAGE='PROCESSING',STARTED_AT=CURRENT_TIMESTAMP,ERROR_CODE=NULL,ERROR_MESSAGE=NULL WHERE ID=? AND STATUS='QUEUED'",
      [job.ID]
    );
    return { ...job, STATUS: 'RUNNING', STAGE: 'PROCESSING' };
  });
}

async function getJobChunks(job) {
  return db.query(
    'SELECT ID,TENANT_ID,DOCUMENT_ID,CHUNK_INDEX,CONTENT,CONTENT_HASH,TOKEN_COUNT,VECTOR_KEY,EMBEDDING_MODEL,STATUS FROM AI_DOCUMENT_CHUNK WHERE TENANT_ID=? AND DOCUMENT_ID=? ORDER BY CHUNK_INDEX',
    [job.TENANT_ID, job.DOCUMENT_ID]
  );
}

async function markChunkEmbedding(id, embeddingModel, vectorKey) {
  return db.execute(
    "UPDATE AI_DOCUMENT_CHUNK SET EMBEDDING_MODEL=?,VECTOR_KEY=?,STATUS='EMBEDDED' WHERE ID=?",
    [embeddingModel || null, vectorKey || null, id]
  );
}

async function markChunkIndexed(id, vectorKey) {
  return db.execute(
    "UPDATE AI_DOCUMENT_CHUNK SET VECTOR_KEY=?,STATUS='INDEXED' WHERE ID=?",
    [vectorKey || null, id]
  );
}

async function lexicalRetrieve(tenantId, query, topK) {
  const dialect = db.dialect();
  const terms = [...new Set(
    String(query).toUpperCase().split(/[^A-Z0-9À-ÿ]+/).filter((term) => term.length >= 3)
  )].slice(0, 8);
  if (!terms.length) return [];

  const clauses = terms.map(() => '(' + dialect.contains('C.CONTENT', '?') + ')').join(' OR ');
  const baseSql =
    "SELECT C.ID,C.TENANT_ID,C.DOCUMENT_ID,C.CHUNK_INDEX,C.CONTENT,C.CONTENT_HASH,C.TOKEN_COUNT,D.TITLE,D.EXTERNAL_KEY,D.ACL_JSON " +
    "FROM AI_DOCUMENT_CHUNK C JOIN AI_DOCUMENT D ON D.ID=C.DOCUMENT_ID AND D.TENANT_ID=C.TENANT_ID " +
    "WHERE C.TENANT_ID=? AND D.STATUS='ACTIVE' AND (" + clauses + ") " +
    "ORDER BY C.DOCUMENT_ID,C.CHUNK_INDEX";
  const rows = await db.query(dialect.limit(baseSql, 50), [tenantId, ...terms]);

  return rows.slice(0, topK).map((row) => ({
    chunk_id: Number(row.ID),
    document_id: Number(row.DOCUMENT_ID),
    chunk_index: Number(row.CHUNK_INDEX),
    content: row.CONTENT,
    title: row.TITLE,
    external_key: row.EXTERNAL_KEY,
    acl_json: row.ACL_JSON,
    token_count: Number(row.TOKEN_COUNT || 0),
    score: terms.reduce((score, term) =>
      score + (String(row.CONTENT).toUpperCase().includes(term) ? 1 : 0), 0),
    source: 'lexical'
  })).sort((a, b) => b.score - a.score).slice(0, topK);
}

async function finishJob(id, status, stage, code = null, message = null) {
  return db.execute(
    'UPDATE AI_INGESTION_JOB SET STATUS=?,STAGE=?,ERROR_CODE=?,ERROR_MESSAGE=?,FINISHED_AT=' +
      db.dialect().currentTimestamp + ' WHERE ID=?',
    [status, stage, code, message, id]
  );
}

async function createIngestion(input) {
  const {
    tenantId, sourceType, externalKey, title, checksum, classification,
    aclJson, metadataJson, correlationId, idempotencyKey, chunks
  } = input;

  return db.withTransaction(async (tx) => {
    const oldJob = await getJobByIdempotency(tx, tenantId, idempotencyKey);
    if (oldJob) {
      return { created: false, idempotent: true, documentId: oldJob.DOCUMENT_ID, job: oldJob };
    }

    const old = await getDocumentByKey(tx, tenantId, externalKey);
    let documentId;
    let versionNo = 1;

    if (old && old.CHECKSUM_SHA256 === checksum && old.STATUS === 'ACTIVE') {
      documentId = Number(old.ID);
      versionNo = Number(old.VERSION_NO);
    } else {
      documentId = old ? Number(old.ID) : await nextId(tx, 'AI_DOCUMENT');
      versionNo = old ? Number(old.VERSION_NO) + 1 : 1;

      if (old) {
        await tx.execute(
          'UPDATE AI_DOCUMENT SET VERSION_NO=?,CHECKSUM_SHA256=?,TITLE=?,CLASSIFICATION=?,ACL_JSON=?,METADATA_JSON=?,STATUS=?,UPDATED_AT=' +
            db.dialect().currentTimestamp + ',DELETED_AT=NULL WHERE ID=? AND TENANT_ID=?',
          [versionNo, checksum, title || null, classification, aclJson, metadataJson, 'ACTIVE', documentId, tenantId]
        );
        await tx.execute(
          'DELETE FROM AI_DOCUMENT_CHUNK WHERE DOCUMENT_ID=? AND TENANT_ID=?',
          [documentId, tenantId]
        );
      } else {
        await tx.execute(
          'INSERT INTO AI_DOCUMENT (ID,TENANT_ID,SOURCE_TYPE,EXTERNAL_KEY,TITLE,VERSION_NO,CHECKSUM_SHA256,CLASSIFICATION,ACL_JSON,STATUS,METADATA_JSON) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [documentId, tenantId, sourceType, externalKey, title || null, versionNo, checksum, classification, aclJson, 'ACTIVE', metadataJson]
        );
      }
    }

    const jobId = await nextId(tx, 'AI_INGESTION_JOB');
    for (const chunk of chunks) {
      const id = await nextId(tx, 'AI_DOCUMENT_CHUNK');
      await tx.execute(
        'INSERT INTO AI_DOCUMENT_CHUNK (ID,TENANT_ID,DOCUMENT_ID,CHUNK_INDEX,CONTENT,CONTENT_HASH,TOKEN_COUNT,VECTOR_KEY,EMBEDDING_MODEL,STATUS) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [id, tenantId, documentId, chunk.index, chunk.content, chunk.hash, chunk.tokenCount, null, null, 'PENDING']
      );
    }

    await tx.execute(
      'INSERT INTO AI_INGESTION_JOB (ID,TENANT_ID,DOCUMENT_ID,IDEMPOTENCY_KEY,STATUS,STAGE,CORRELATION_ID) VALUES (?,?,?,?,?,?,?)',
      [jobId, tenantId, documentId, idempotencyKey, 'QUEUED', 'CHUNKED', correlationId || null]
    );

    return {
      created: true,
      idempotent: false,
      documentId,
      versionNo,
      chunkCount: chunks.length,
      jobId,
      status: 'QUEUED',
      stage: 'CHUNKED'
    };
  });
}

module.exports = {
  createIngestion,
  getDocumentByKey,
  getJobByIdempotency,
  claimNextJob,
  getJobChunks,
  markChunkEmbedding,
  markChunkIndexed,
  lexicalRetrieve,
  finishJob
};
