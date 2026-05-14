const { Client } = require('pg');

async function test() {
  const client = new Client({
    connectionString: 'postgresql://postgres.jegerdfhcbrcziuuhsbe:BripbPKL9y4AWz2A@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to the database.');
    
    const targetId = '3f973731-fe01-4a12-b8c2-3d76793505cd';
    
    console.log(`\n--- Fetching Trip Info for ID: ${targetId} ---`);
    const timelineRes = await client.query('SELECT id, title, start_date, end_date FROM timelines WHERE id = $1', [targetId]);
    
    if (timelineRes.rows.length === 0) {
      console.log(`⚠️ Trip not found in database.`);
    } else {
      console.log(timelineRes.rows[0]);
    }
    
    console.log(`\n--- Fetching Events for Trip ID: ${targetId} ---`);
    const eventsRes = await client.query(`
      SELECT id, external_place_id, category, start_time, end_time, order_index 
      FROM timeline_events 
      WHERE timeline_id = $1 
      ORDER BY start_time ASC
    `, [targetId]);
    
    console.log(`Found ${eventsRes.rows.length} events:`);
    if (eventsRes.rows.length > 0) {
      console.table(eventsRes.rows);
    }

  } catch (err) {
    console.error('❌ Database query failed:', err);
  } finally {
    await client.end();
  }
}

test();
