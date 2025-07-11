'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

export interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  separator?: React.ReactNode
  className?: string
  showHome?: boolean
  homeLabel?: string
  homeHref?: string
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  (
    {
      items,
      separator = '/',
      className,
      showHome = true,
      homeLabel = 'Home',
      homeHref = '/',
      ...props
    },
    ref
  ) => {
    const pathname = usePathname()

    // Generate breadcrumb items from pathname if not provided
    const generateBreadcrumbItems = (): BreadcrumbItem[] => {
      if (items) return items

      const pathSegments = pathname.split('/').filter(Boolean)
      const breadcrumbItems: BreadcrumbItem[] = []

      if (showHome) {
        breadcrumbItems.push({
          label: homeLabel,
          href: homeHref,
          current: pathSegments.length === 0,
        })
      }

      let currentPath = ''
      pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`
        const isLast = index === pathSegments.length - 1

        breadcrumbItems.push({
          label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
          href: isLast ? undefined : currentPath,
          current: isLast,
        })
      })

      return breadcrumbItems
    }

    const breadcrumbItems = generateBreadcrumbItems()

    if (breadcrumbItems.length === 0) return null

    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn('flex items-center space-x-2', className)}
        {...props}
      >
        <ol className="flex items-center space-x-2">
          {breadcrumbItems.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span
                  className="mx-2 text-gray-400"
                  aria-hidden="true"
                >
                  {separator}
                </span>
              )}
              
              {item.current ? (
                <span
                  className="text-gray-500 font-medium"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-500">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    )
  }
)

Breadcrumb.displayName = 'Breadcrumb'

export { Breadcrumb } 