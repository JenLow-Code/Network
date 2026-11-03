import type { Router } from './http/router';

/**
 * OpenAPI 3.1 document generated from the live route table, so it cannot drift from what the
 * Worker actually serves. Response shapes are described in src/contracts/dto.ts and examples
 * live in middleware/docs/API.md.
 */
export function openApi(router: Router, version: string): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of router.routes) {
    const path = route.path.replace(/:([A-Za-z]+)/g, '{$1}');
    const params = route.keys.map(name => ({ name, in: 'path', required: true, schema: { type: 'string' } }));
    paths[path] = paths[path] || {};
    paths[path][route.method.toLowerCase()] = {
      tags: [route.tag],
      summary: route.summary,
      ...(params.length ? { parameters: params } : {}),
      ...(route.auth === 'required' || route.auth === 'moderator' ? { security: [{ bearer: [] }] } : route.auth === 'optional' ? { security: [{}, { bearer: [] }] } : {}),
      ...(route.auth === 'moderator' ? { 'x-roles': ['moderator', 'admin'] } : {}),
      responses: {
        [String(route.status ?? 200)]: { description: 'Success' },
        ...(route.auth === 'required' || route.auth === 'moderator' ? { '401': { $ref: '#/components/responses/Error' } } : {}),
        '400': { $ref: '#/components/responses/Error' },
        '404': { $ref: '#/components/responses/Error' },
        '422': { $ref: '#/components/responses/Error' },
        '429': { $ref: '#/components/responses/Error' },
      },
    };
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'JenLow Network API',
      version,
      description: 'Cloudflare Worker + D1. /v1/auth/* keeps the beta auth contract ({"error":"code"}); /api/* uses the error envelope {"error":{code,message,requestId,details?}}. Timestamps are ISO 8601 UTC. Lists use opaque keyset cursors.',
    },
    servers: [{ url: 'https://jenlow-network-auth.jenlow-production.workers.dev' }],
    components: {
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT (HS256, iss jenlow-network-api, aud jenlow-network, 15 min)' } },
      responses: {
        Error: {
          description: 'Error envelope',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'object', required: ['code', 'message', 'requestId'], properties: { code: { type: 'string' }, message: { type: 'string' }, requestId: { type: 'string' }, details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, code: { type: 'string' }, message: { type: 'string' } } } } } } } } } },
        },
      },
    },
    paths,
  };
}
