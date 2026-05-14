const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://REMOVED_SUPABASE_USERNAME:REMOVED_SUPABASE_PASSWORD@REMOVED_SUPABASE_HOST:5432/postgres"
});

async function debugTable() {
  try {
    await client.connect();
    
    console.log("--- Checking column types for places_drink ---");
    const columnsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'places_drink'
    `);
    console.table(columnsRes.rows);

    console.log("\n--- Checking for ID 165 ---");
    // Try different ways of matching 165
    const queries = [
      { name: "As numeric", sql: "SELECT id, name FROM places_drink WHERE id = 165" },
      { name: "As string", sql: "SELECT id, name FROM places_drink WHERE id::text = '165'" },
      { name: "Partial match", sql: "SELECT id, name FROM places_drink WHERE id::text LIKE '%165%'" }
    ];

    for (const q of queries) {
      try {
        const res = await client.query(q.sql);
        console.log(`${q.name}: Found ${res.rows.length} records.`);
        if (res.rows.length > 0) console.log(res.rows[0]);
      } catch (e) {
        console.log(`${q.name}: Error - ${e.message}`);
      }
    }

    console.log("\n--- Listing first 5 IDs in places_drink ---");
    const listRes = await client.query("SELECT id, name FROM places_drink LIMIT 5");
    console.table(listRes.rows);

  } catch (err) {
    console.error('Debug failed:', err);
  } finally {
    await client.end();
  }
}

debugTable();
