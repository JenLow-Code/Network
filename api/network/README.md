# Network API gateway — staging
The Network gateway is distinct from shared middleware. It has no database binding
and no signing secret. Its only downstream is the private SECURITY service
binding. The permitted endpoints are explicit; it cannot proxy arbitrary URLs,
trust client-supplied identity headers, or serve other product routes.

The current implementation is identity-only. The functional backend, scoped
resource authorization, gateway rate limits, standardized response contracts and
session revocation remain release gates. Existing production frontend and auth
Worker are not repointed. Do not deploy this example over the working auth Worker.
The eventual public hostname is network-api.jenlow.net, after staging validation.
Tools, Production and Live require independent gateways and product-scoped identity
validation; no Network token should automatically authorize those products.
