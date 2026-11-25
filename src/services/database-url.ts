export function isSupabaseDatabase(url: URL) {
  const host = url.hostname.toLowerCase();
  return host.endsWith(".supabase.co") || host.endsWith(".supabase.com");
}

export function validateDatabaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL.");
  }
  const schemas = url.searchParams.getAll("schema");
  if (isSupabaseDatabase(url) && (schemas.length !== 1 || schemas[0] !== "trader_app")) {
    throw new Error("Supabase DATABASE_URL must use the private trader_app schema.");
  }
}
