class VectorStore {
  constructor(name) { this.name = name; }
  async upsert() { const error = new Error('AI_VECTOR_STORE_NOT_IMPLEMENTED'); error.code = error.message; error.status = 503; throw error; }
  async search() { const error = new Error('AI_VECTOR_STORE_NOT_IMPLEMENTED'); error.code = error.message; error.status = 503; throw error; }
  async delete() { const error = new Error('AI_VECTOR_STORE_NOT_IMPLEMENTED'); error.code = error.message; error.status = 503; throw error; }
}
function createVectorStore(name) { return name ? new VectorStore(name) : null; }
module.exports = { VectorStore, createVectorStore };
