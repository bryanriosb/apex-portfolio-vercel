const { getSupabaseAdminClient } = require('./lib/actions/supabase.ts');

async function test() {
  try {
    const supabase = await getSupabaseAdminClient();
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('Error listing users:', error);
      return;
    }
    console.log('Users:');
    users.forEach(u => {
      console.log(`- Email: ${u.email}, Name: ${u.user_metadata?.name}, Role: ${u.user_metadata?.role}`);
    });
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
