import { appUrl, resourceUrl } from '@/lib/config';
export function GET() {
  return Response.json({
    resource: resourceUrl(),
    authorization_servers: [appUrl()],
    scopes_supported: ['events:read', 'events:write'],
    bearer_methods_supported: ['header'],
    resource_name: 'YQG Events',
    resource_documentation: `${appUrl()}/connect`,
  });
}
