const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://REMOVED_SUPABASE_USERNAME:REMOVED_SUPABASE_PASSWORD@REMOVED_SUPABASE_HOST:5432/postgres"
});

async function fetchEvents() {
  const tripId = '3f973731-fe01-4a12-b8c2-3d76793505cd';
  console.log(`\n=== FETCHING ALL EVENTS FOR TIMELINE ID: ${tripId} ===\n`);
  
  try {
    await client.connect();
    
    // Fetch events ordered by order_index
    const res = await client.query(
      'SELECT * FROM timeline_events WHERE timeline_id = $1 ORDER BY order_index ASC',
      [tripId]
    );
    
    if (res.rows.length === 0) {
      console.log('[INFO] No events found for this timeline.');
    } else {
      console.table(res.rows.map(row => ({
        ID: row.id,
        PlaceID: row.external_place_id,
        Category: row.category,
        Start: row.start_time,
        End: row.end_time,
        Order: row.order_index,
        Status: row.status
      })));
      
      console.log('\n--- Full Detail of First Event Sample ---');
      console.log(JSON.stringify(res.rows[0], null, 2));
    }
    
  } catch (err) {
    console.error('[ERROR] Failed to query database:', err.message);
  } finally {
    await client.end();
  }
}

fetchEvents();
