import { Navigation } from './Navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
  user?: {
    name: string
    email: string
    role: string
  }
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
} 