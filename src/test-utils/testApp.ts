import express from 'express'
import { NextApiRequest, NextApiResponse } from 'next'
import { NextRequest, NextResponse } from 'next/server'

// Type for Next.js API route handlers (Pages Router)
type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void

// Type for Next.js App Router route handlers
type AppRouteHandler = (req: NextRequest) => Promise<NextResponse>

// Express middleware to convert Express req/res to Next.js format
const createNextApiMiddleware = (handler: ApiHandler) => {
  return async (req: express.Request, res: express.Response) => {
    // Convert Express request to NextApiRequest format
    const nextReq = {
      ...req,
      query: req.query,
      cookies: req.cookies,
      body: req.body,
      method: req.method,
      url: req.url,
      headers: req.headers,
    } as NextApiRequest

    // Convert Express response to NextApiResponse format
    const nextRes = {
      ...res,
      status: (code: number) => {
        res.status(code)
        return nextRes
      },
      json: (data: any) => {
        res.json(data)
        return nextRes
      },
      send: (data: any) => {
        res.send(data)
        return nextRes
      },
      end: () => {
        res.end()
        return nextRes
      },
      setHeader: (name: string, value: string) => {
        res.setHeader(name, value)
        return nextRes
      },
    } as NextApiResponse

    try {
      await handler(nextReq, nextRes)
    } catch (error) {
      console.error('API handler error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// Express middleware to convert Express req/res to App Router format
const createAppRouteMiddleware = (handler: AppRouteHandler) => {
  return async (req: express.Request, res: express.Response) => {
    try {
      // Convert Express request to NextRequest format
      // Create absolute URL for NextRequest
      const baseUrl = 'http://localhost:3000'
      const absoluteUrl = req.url.startsWith('http') ? req.url : `${baseUrl}${req.url}`
      
      const nextReq = new NextRequest(absoluteUrl, {
        method: req.method,
        headers: req.headers as any,
        body: req.body ? JSON.stringify(req.body) : undefined,
      })

      // Call the App Router handler
      const nextRes = await handler(nextReq)

      // Convert NextResponse back to Express response
      const responseData = await nextRes.json().catch(() => null)
      
      // Set status and headers
      res.status(nextRes.status)
      nextRes.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })

      // Send response
      if (responseData) {
        res.json(responseData)
      } else {
        res.send(await nextRes.text())
      }
    } catch (error) {
      console.error('App Router handler error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// Create Express app for testing
export function createTestApp() {
  const app = express()

  // Middleware for parsing JSON and URL-encoded bodies
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Helper to mount Pages Router API handlers
  app.mountApiRoute = (path: string, handler: ApiHandler) => {
    app.all(path, createNextApiMiddleware(handler))
  }

  // Helper to mount App Router API handlers
  app.mountAppRoute = (path: string, handler: AppRouteHandler) => {
    app.all(path, createAppRouteMiddleware(handler))
  }

  return app
}

// Default test app instance
const testApp = createTestApp()

// Mount common test routes
testApp.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

export default testApp 