import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Service client for background processing - bypasses RLS
export function createServiceClient() {
  console.log('🔧 [Server] Creating service client...');
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  
  console.log('🔧 [Server] Environment variables validated');
  
  try {
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key bypasses RLS
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // No-op for service client
          },
        },
        // Add configuration for better serverless compatibility
        auth: {
          persistSession: false, // Don't persist sessions in serverless
        },
        global: {
          headers: {
            'X-Client-Info': 'supabase-js-node', // Help identify client type
          },
        },
        // Configure connection pooling for serverless
        db: {
          schema: 'public',
        },
      }
    );
    
    console.log('✅ [Server] Service client created successfully');
    return client;
  } catch (error) {
    console.error('❌ [Server] Failed to create service client:', error);
    throw error;
  }
}
