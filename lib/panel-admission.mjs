// Exact HTTP routes do not inherit DSH's /api gateway authentication.
// Reuse the host's browser/token admission and fail closed on older hosts.
export function admittedPanelHost(ctx, host) {
  return {
    register(route) {
      return host.register({ ...route, handler(req, res) {
        const connection = ctx.get?.('connection')
        const admission = connection?.admit?.(req)
        if (!admission || 'rejection' in admission) {
          res.writeHead(admission?.rejection ?? 503)
          res.end('Import panel access denied')
          return
        }
        if (req.method !== 'POST') {
          res.writeHead(405, { Allow: 'POST' })
          res.end('Method not allowed')
          return
        }
        return route.handler(req, res)
      } })
    },
  }
}
