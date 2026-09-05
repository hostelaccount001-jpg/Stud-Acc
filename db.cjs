const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jjkxtgtbogtzhbuxutag.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqa3h0Z3Rib2d0emhidXh1dGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIxNTg1OSwiZXhwIjo1MTk2MDEzNDU5fQ.Lw9pQo3u3o_c6v_h8J_m4y3Z3s5_b-aXn_c5K2M5_X4');
async function run() {
  const { data } = await supabase.from('students').select('suid, fingerprints').not('fingerprints', 'is', null);
  console.log(JSON.stringify(data, null, 2));
}
run();
