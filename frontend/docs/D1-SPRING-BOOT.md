# Cloudflare D1 now; Java/Spring Boot later

Cloudflare D1 is a hosted **SQLite** SQL database, not PostgreSQL or a normal externally accessible JDBC database.

Possible backend paths:
1. Recommended if staying on D1: **Cloudflare Worker as a narrow, authenticated D1 API** (using native D1 binding), with React Native frontend consuming versioned HTTP endpoints.
2. If Java Spring Boot remains the preferred core business backend: **Spring Boot -> authenticated Cloudflare Worker API -> D1**. Java does not automatically receive a D1 binding or conventional PostgreSQL JDBC connection.
3. Java may query the Cloudflare D1 HTTP API from outside, but that entails credential management, API overhead and a less conventional repository layer.
4. If Java's JPA/Hibernate/JDBC transactional ecosystem becomes the priority, consider a separate managed PostgreSQL database instead of D1.

Do not deploy the browser's D1 API token, service key, or any sensitive secrets to the frontend. Schema and migrations live under /database, API/middleware under /middleware. This frontend currently uses on-device demo local storage. No production database was created or connected.
