#!/bin/bash
# Query LanceDB to show all journal entries

docker compose exec -T ingestion node -e "
const { connect } = require('@lancedb/lancedb');

async function main() {
  const db = await connect('s3://lancedb/journal', {
    storageOptions: {
      awsAccessKeyId: 'minioadmin',
      awsSecretAccessKey: 'minioadmin',
      awsEndpoint: 'http://minio:9000',
      awsRegion: 'us-east-1',
      allowHttp: 'true'
    }
  });

  const table = await db.openTable('journal_entries');
  const count = await table.countRows();
  const results = await table.query().limit(50).toArray();

  // Column widths
  const colNum = 4;
  const colDate = 12;
  const colText = 45;
  const colVector = 12;

  const pad = (str, len) => str.toString().padEnd(len).substring(0, len);
  const padCenter = (str, len) => {
    const s = str.toString();
    const left = Math.floor((len - s.length) / 2);
    return ' '.repeat(left) + s + ' '.repeat(len - left - s.length);
  };

  const hr = '├' + '─'.repeat(colNum) + '┼' + '─'.repeat(colDate) + '┼' + '─'.repeat(colText) + '┼' + '─'.repeat(colVector) + '┤';
  const top = '┌' + '─'.repeat(colNum) + '┬' + '─'.repeat(colDate) + '┬' + '─'.repeat(colText) + '┬' + '─'.repeat(colVector) + '┐';
  const bot = '└' + '─'.repeat(colNum) + '┴' + '─'.repeat(colDate) + '┴' + '─'.repeat(colText) + '┴' + '─'.repeat(colVector) + '┘';

  console.log();
  console.log(\`LanceDB Entries (\${count} total)\`);
  console.log();
  console.log(top);
  console.log('│' + padCenter('#', colNum) + '│' + padCenter('Date', colDate) + '│' + padCenter('Text', colText) + '│' + padCenter('Vector', colVector) + '│');
  console.log(hr);

  results.forEach((r, i) => {
    const vectorLen = r.vector ? (Array.isArray(r.vector) ? r.vector.length : r.vector.length) : 0;
    const hasVector = vectorLen === 1024;
    const cleanText = r.text.replace(/[\r\n]+/g, ' ');
    const text = cleanText.substring(0, colText - 2) + (cleanText.length > colText - 2 ? '..' : '');
    const vectorStatus = hasVector ? '✓ 1024-dim' : '✗ Missing';

    console.log('│' + padCenter(i + 1, colNum) + '│ ' + pad(r.entry_date, colDate - 2) + ' │ ' + pad(text, colText - 2) + ' │' + padCenter(vectorStatus, colVector) + '│');
  });

  console.log(bot);
  console.log();
}

main().catch(console.error);
"
