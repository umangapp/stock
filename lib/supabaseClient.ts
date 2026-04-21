import { createClient } from '@supabase/supabase-js'

// ดึงค่าจากไฟล์ .env.local ที่คุณสร้างไว้มาใช้งาน
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// สร้างตัวเชื่อมต่อ (Client) เพื่อเอาไปใช้ในหน้าอื่นๆ
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
