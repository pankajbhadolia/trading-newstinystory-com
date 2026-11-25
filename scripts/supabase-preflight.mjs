export class PrivateSchemaError extends Error {}

export async function assertPrivateSchema(prisma) {
  const [result] = await prisma.$queryRaw`
    SELECT n.oid IS NOT NULL AS "exists",
      (SELECT count(*) = 3 FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')) AS "rolesExist",
      CASE WHEN n.oid IS NOT NULL AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
        THEN has_schema_privilege('anon', n.oid, 'USAGE') ELSE true END AS "anonAccess",
      CASE WHEN n.oid IS NOT NULL AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
        THEN has_schema_privilege('authenticated', n.oid, 'USAGE') ELSE true END AS "authenticatedAccess",
      CASE WHEN n.oid IS NOT NULL AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
        THEN has_schema_privilege('service_role', n.oid, 'USAGE') ELSE true END AS "serviceAccess",
      CASE WHEN n.oid IS NOT NULL THEN
        has_schema_privilege(current_user, n.oid, 'USAGE') AND has_schema_privilege(current_user, n.oid, 'CREATE')
        ELSE false END AS "migrationAccess"
    FROM (SELECT to_regnamespace('trader_app')::oid AS oid) n
  `;
  if (!result.exists) throw new PrivateSchemaError("The trader_app schema does not exist. Create it securely first as described in README.");
  if (!result.rolesExist) throw new PrivateSchemaError("The expected Supabase database roles were not found.");
  if (result.anonAccess || result.authenticatedAccess || result.serviceAccess) throw new PrivateSchemaError("The trader_app schema is accessible to Supabase Data API roles; revoke access before migrating.");
  if (!result.migrationAccess) throw new PrivateSchemaError("The database migration user needs USAGE and CREATE on trader_app.");
}
