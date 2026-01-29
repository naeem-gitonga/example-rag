docker compose exec ingestion node -e "
  const lancedb = require('@lancedb/lancedb');
  (async () => {
    const db = await lancedb.connect('s3://lancedb/documents', {
      storageOptions: {
        endpoint: 'http://minio:9000',
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin',
        region: 'us-east-1',
        allowHttp: 'true'
      }
    });
    const table = await db.openTable('document_entries');
    await table.delete('id IS NOT NULL');
    console.log('All entries deleted');
  })();
  "   