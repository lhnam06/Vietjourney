const { Client } = require('pg');

async function test() {
  const client = new Client({
    connectionString: 'postgresql://postgres.jegerdfhcbrcziuuhsbe:BripbPKL9y4AWz2A@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to the timeline database.');
    
    // Find a valid timeline_id to attach the event to
    const timelines = await client.query('SELECT id FROM timelines LIMIT 1');
    if (timelines.rows.length === 0) {
       console.log('⚠️ No timelines found in the database. Cannot test insertion.');
       return;
    }
    const timelineId = timelines.rows[0].id;
    console.log(`Found a timeline (ID: ${timelineId}), attempting to write a test event...`);

    // Insert a dummy event
    const insertRes = await client.query(`
      INSERT INTO timeline_events (
        id, timeline_id, external_place_id, category, start_time, end_time, order_index, status, version, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'test_external_id', 'ACTIVITY', now(), now() + interval '1 hour', 0, 'PLANNED', 0, now(), now()
      ) RETURNING id
    `, [timelineId]);
    
    console.log('✅ Successfully inserted a test event with ID:', insertRes.rows[0].id);

    // Clean up
    await client.query('DELETE FROM timeline_events WHERE id = $1', [insertRes.rows[0].id]);
    console.log('✅ Test event successfully deleted (cleanup).');

  } catch (err) {
    console.error('❌ Database connection or query failed:', err);
  } finally {
    await client.end();
  }
}

test();
