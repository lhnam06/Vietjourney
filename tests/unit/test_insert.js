const { Client } = require('pg');

async function test() {
  const client = new Client({
    connectionString: 'postgresql://REMOVED_SUPABASE_USERNAME:REMOVED_SUPABASE_PASSWORD@REMOVED_SUPABASE_HOST:5432/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to the database.');
    
    const targetId = '3f973731-fe01-4a12-b8c2-3d76793505cd';
    
    // Insert event on 14th of May 2026
    const insertRes = await client.query(`
      INSERT INTO timeline_events (
        id, timeline_id, external_place_id, category, start_time, end_time, order_index, status, version, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 
        $1, 
        'test_event_may_14', 
        'ACTIVITY', 
        '2026-05-14T09:00:00Z', 
        '2026-05-14T11:00:00Z', 
        0, 
        'PLANNED', 
        0, 
        now(), 
        now()
      ) RETURNING id
    `, [targetId]);
    
    console.log('✅ Successfully inserted a test event for May 14th, 2026 with ID:', insertRes.rows[0].id);

  } catch (err) {
    console.error('❌ Database query failed:', err);
  } finally {
    await client.end();
  }
}

test();
