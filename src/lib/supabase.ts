import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zetveltshlodtqzvkleg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldHZlbHRzaGxvZHRxenZrbGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTY1MzMsImV4cCI6MjA5NTAzMjUzM30.hq_wI2mPgWDtSMVFD_L3YTib8Su8cYXBTBFDEJrYhxk';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);