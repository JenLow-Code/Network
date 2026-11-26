# Security-only production schema remediation

The production database was recorded at migrations 0001–0008. The approved security middleware expects user_roles, defined in 0010, but applying the full 0010 would alter operational tables. This narrowly scoped SQL creates only the missing role registry. It is safe to replay; existing users and their privileges are unchanged. No automatic administrator grant is made. The current middleware is Network-scoped; product-specific grants remain a separate security task. Before applying 0010 in any later migration plan, reconcile the already-created registry and validate its definition. Do not mark 0010 as applied on the basis of this remediation.

Rollback: retain the D1 Time Travel bookmark taken immediately before the change; if necessary and after checking for new writes, remove the empty registry only. Do not restore the entire database over later legitimate writes without review. No operational schema migration is authorized here.
