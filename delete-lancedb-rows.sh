docker compose exec query node -e "                                                    
  const lancedb = require('@lancedb/lancedb');                                           
  (async () => {                                                                         
    const db = await lancedb.connect('s3://lancedb/journal', {                           
      storageOptions: {                                                                  
        endpoint: 'http://minio:9000',                                                   
        accessKeyId: 'minioadmin',                                                       
        secretAccessKey: 'minioadmin',                                                   
        region: 'us-east-1',                                                             
        allowHttp: 'true'                                                                
      }                                                                                  
    });                                                                                  
    const table = await db.openTable('journal_entries');                                 
    await table.delete('id IS NOT NULL');                                                
    console.log('All entries deleted');                                                  
  })();                                                                                  
  "   