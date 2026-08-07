const WRITE_KEYWORDS =
  /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|TRUNCATE|ATTACH|DETACH|VACUUM|REINDEX|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|PRAGMA\s+\w+\s*=)/i;

const DESTRUCTIVE_KEYWORDS = /^\s*(DROP|TRUNCATE|DELETE\s+FROM\s+\w+\s*;?\s*$|ALTER\s+TABLE\s+\w+\s+DROP)/i;

const SELECT_ONLY = /^\s*(SELECT|WITH|EXPLAIN|PRAGMA\s+(?!.*=))/i;

export class SqlGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SqlGuardError";
  }
}

export function assertSingleStatement(sql: string): void {
  const trimmed = sql.trim();
  if (!trimmed) {
    throw new SqlGuardError("SQL query is empty.");
  }

  const withoutStrings = trimmed.replace(/'(?:''|[^'])*'/g, "''").replace(/"(?:\"\"|[^"])*"/g, '""');
  const statements = withoutStrings
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  if (statements.length > 1) {
    throw new SqlGuardError("Only one SQL statement is allowed per call.");
  }
}

export function assertReadQuery(sql: string): void {
  assertSingleStatement(sql);
  const trimmed = sql.trim();

  if (!SELECT_ONLY.test(trimmed)) {
    throw new SqlGuardError("query_sql only allows read operations (SELECT, WITH, EXPLAIN, PRAGMA read).");
  }

  if (WRITE_KEYWORDS.test(trimmed)) {
    throw new SqlGuardError("query_sql rejected a write operation. Use execute_sql instead.");
  }
}

export function assertWriteAllowed(sql: string, options: { confirmWrite: boolean; allowDestructive: boolean }): void {
  assertSingleStatement(sql);
  const trimmed = sql.trim();

  if (SELECT_ONLY.test(trimmed) && !/^\s*PRAGMA/i.test(trimmed)) {
    throw new SqlGuardError("execute_sql is for write/DDL operations. Use query_sql for SELECT.");
  }

  if (DESTRUCTIVE_KEYWORDS.test(trimmed) && !options.allowDestructive) {
    throw new SqlGuardError(
      "Destructive SQL blocked. Set allowDestructive: true if you intentionally want DROP/DELETE/TRUNCATE."
    );
  }

  if (!options.confirmWrite) {
    throw new SqlGuardError("Write operations require confirmWrite: true.");
  }
}

export function isWriteQuery(sql: string): boolean {
  return WRITE_KEYWORDS.test(sql.trim());
}

export function quoteIdentifier(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new SqlGuardError(`Invalid table name: ${name}`);
  }
  return `"${name.replace(/"/g, '""')}"`;
}
