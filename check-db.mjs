import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkBani() {
  const { data, error } = await supabase.from('banis').select('*')
  console.log('--- ALL BANIS ---')
  console.log(JSON.stringify(data, null, 2))
  if (error) console.error('Error:', error)
}

checkBani()
