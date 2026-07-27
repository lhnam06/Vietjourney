const { Client } = require('pg');

const connectionString = process.env.DB_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DB_URL or DATABASE_URL is required');
}

const client = new Client({
  connectionString
});

async function runTest() {
  const tripId = '3f973731-fe01-4a12-b8c2-3d76793505cd';
  console.log(`\n=== UNIT TEST: FETCHING COORDINATES FOR TRIP ID: ${tripId} ===\n`);

  try {
    await client.connect();

    // 1. Fetch all events for the trip
    const eventsRes = await client.query(
      'SELECT id, external_place_id, category, start_time FROM timeline_events WHERE timeline_id = $1 ORDER BY start_time ASC',
      [tripId]
    );

    const events = eventsRes.rows;
    console.log(`Found ${events.length} events.\n`);

    const results = [];

    for (const event of events) {
      const { external_place_id, category, id: eventId } = event;
      
      // Map category to table name
      let tableName = '';
      if (category === 'FOOD') tableName = 'places_food';
      else if (category === 'DRINK') tableName = 'places_drink';
      else if (category === 'ACTIVITY') tableName = 'places_activity';

      let coordData = { lat: 'N/A', lng: 'N/A', name: 'NOT FOUND' };

      if (tableName && external_place_id) { // Allow all IDs
        try {
          const placeRes = await client.query(
            `SELECT name, latitude, longitude FROM ${tableName} WHERE id::text = $1`,
            [external_place_id]
          );
          
          if (placeRes.rows.length > 0) {
            const row = placeRes.rows[0];
            coordData = {
              lat: row.latitude,
              lng: row.longitude,
              name: row.name
            };
          }
        } catch (err) {
          console.error(`[ERROR] Querying table ${tableName} for ID ${external_place_id}:`, err.message);
        }
      }

      results.push({
        'Event ID': eventId.substring(0, 8) + '...',
        'Category': category,
        'Place ID': external_place_id.length > 15 ? (external_place_id.substring(0, 8) + '...') : external_place_id,
        'Table': tableName,
        'Place Name': coordData.name,
        'Latitude': coordData.lat,
        'Longitude': coordData.lng
      });
    }

    console.table(results);

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await client.end();
  }
}

runTest();
