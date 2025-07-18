# Navigation System - Mobile-First Design

## Overview

The Pipedriver navigation system is designed with a mobile-first approach, providing intuitive navigation that adapts seamlessly between mobile and desktop experiences. The system prioritizes touch interactions on mobile while offering powerful navigation options on desktop.

## Navigation Architecture

### Responsive Navigation Strategy
- **Mobile (320px - 768px)**: Bottom tab bar navigation
- **Tablet (768px - 1024px)**: Enhanced bottom navigation with more options
- **Desktop (1024px+)**: Sidebar navigation with top navigation bar

### Navigation Components
```
Navigation System
├── MobileNavigation
│   ├── BottomNavigation (Primary)
│   ├── HamburgerMenu (Secondary)
│   └── Breadcrumbs (Context)
└── DesktopNavigation
    ├── SidebarNavigation (Primary)
    ├── TopNavigation (Secondary)
    └── Breadcrumbs (Context)
```

## Mobile Navigation

### Bottom Navigation Bar
The primary navigation method for mobile devices, providing easy thumb access to main sections.

#### Design Specifications
- **Position**: Fixed bottom of screen
- **Height**: 64px (minimum touch target)
- **Background**: White with subtle shadow
- **Border**: Top border for visual separation
- **Safe Area**: Respects device safe areas (notches, home indicators)

#### Navigation Items
1. **Dashboard** (Home icon)
   - Icon: `M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z`
   - Label: "Dashboard"
   - Route: `/dashboard`

2. **Campaigns** (Campaign icon)
   - Icon: `M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10`
   - Label: "Campaigns"
   - Route: `/campaigns`

3. **My-500** (Contacts icon)
   - Icon: `M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z`
   - Label: "My-500"
   - Route: `/my-500`

4. **Analytics** (Chart icon)
   - Icon: `M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z`
   - Label: "Analytics"
   - Route: `/analytics`

#### Interaction Patterns
- **Tap**: Navigate to section
- **Long Press**: Show section options (if available)
- **Swipe**: Navigate between sections (optional)
- **Visual Feedback**: Active state with color and icon changes

#### Active State Design
- **Active Tab**: Blue background (#3b82f6) with white icon
- **Inactive Tab**: Gray icon (#6b7280) with transparent background
- **Animation**: Smooth transition between states
- **Badge Support**: Notification badges for unread items

### Hamburger Menu (Secondary Navigation)
Secondary navigation for additional options and user actions.

#### Menu Items
- **Profile**: User profile and settings
- **Help**: Help and support resources
- **Settings**: Application settings
- **Sign Out**: Logout functionality

#### Design Specifications
- **Trigger**: Hamburger icon in top-left corner
- **Position**: Full-screen overlay
- **Animation**: Slide-in from left
- **Backdrop**: Semi-transparent overlay
- **Close**: Tap backdrop or close button

### Breadcrumb Navigation
Contextual navigation showing current location and hierarchy.

#### Design Specifications
- **Position**: Top of content area
- **Style**: Horizontal list with separators
- **Touch Targets**: 44px minimum
- **Truncation**: Long paths are truncated with ellipsis

## Desktop Navigation

### Sidebar Navigation
Primary navigation for desktop users, providing quick access to all sections.

#### Design Specifications
- **Position**: Fixed left side
- **Width**: 64px (collapsed) / 240px (expanded)
- **Background**: Dark blue (#1e3a8a)
- **Height**: Full viewport height
- **Shadow**: Subtle shadow for depth

#### Navigation Items
Same items as mobile navigation with additional features:
- **Tooltips**: Hover tooltips for collapsed state
- **Labels**: Visible labels in expanded state
- **Badges**: Notification badges
- **Sub-items**: Expandable sections (if needed)

#### Interaction Patterns
- **Hover**: Show tooltips and highlight items
- **Click**: Navigate to section
- **Expand/Collapse**: Toggle sidebar width
- **Keyboard**: Full keyboard navigation support

### Top Navigation Bar
Secondary navigation bar for page-specific actions and user interface.

#### Design Specifications
- **Position**: Fixed top, right of sidebar
- **Height**: 64px
- **Background**: White with subtle border
- **Width**: Full width minus sidebar

#### Components
- **Page Title**: Current page title
- **Search Bar**: Global search functionality
- **Help Button**: Quick access to help
- **Notifications**: Notification bell with badge
- **User Menu**: User profile and settings

#### User Menu Items
- **Profile**: User profile page
- **Settings**: Application settings
- **API Keys**: API key management
- **Sign Out**: Logout functionality

## Responsive Navigation Switching

### Breakpoint Strategy
- **Mobile**: 320px - 768px (Bottom navigation)
- **Tablet**: 768px - 1024px (Enhanced bottom navigation)
- **Desktop**: 1024px+ (Sidebar navigation)

### Switching Behavior
- **Automatic**: Based on screen size
- **Smooth Transitions**: Animated switching
- **State Persistence**: Maintains navigation state
- **No Page Reload**: Seamless switching

### Implementation
```typescript
// Responsive navigation switching
const useResponsiveNavigation = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  return { isMobile };
};
```

## Touch Interaction Patterns

### Swipe Gestures
- **Swipe Left/Right**: Navigate between main sections
- **Swipe Up/Down**: Refresh content (pull-to-refresh)
- **Long Press**: Context menus and secondary actions
- **Double Tap**: Quick actions and shortcuts

### Touch Targets
- **Minimum Size**: 44px x 44px for all interactive elements
- **Spacing**: 8px minimum between touch targets
- **Visual Feedback**: Clear touch states and animations
- **Accessibility**: Proper ARIA labels and descriptions

### Haptic Feedback
- **Success**: Light haptic feedback for successful actions
- **Error**: Medium haptic feedback for errors
- **Navigation**: Light haptic feedback for navigation changes
- **Selection**: Light haptic feedback for item selection

## Accessibility Features

### Mobile Accessibility
- **Touch Targets**: Minimum 44px for all interactive elements
- **Voice Control**: Voice navigation support
- **Screen Readers**: Proper ARIA labels and descriptions
- **Color Contrast**: High contrast for mobile viewing

### Desktop Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Proper focus handling
- **Screen Readers**: Semantic HTML and ARIA attributes
- **High Contrast**: Support for high contrast mode

### General Accessibility
- **WCAG 2.1 AA**: Full compliance with accessibility standards
- **Semantic HTML**: Proper HTML structure
- **ARIA Labels**: Comprehensive ARIA labeling
- **Focus Indicators**: Clear focus indicators

## Performance Optimization

### Mobile Performance
- **Touch Events**: Optimized touch event handling
- **Animations**: 60fps smooth animations
- **Memory Usage**: Efficient memory management
- **Battery Life**: Optimized for battery efficiency

### Desktop Performance
- **Hover Events**: Efficient hover event handling
- **Keyboard Events**: Optimized keyboard navigation
- **Rendering**: Efficient component rendering
- **Caching**: Navigation state caching

## Implementation Components

### BottomNavigation Component
```typescript
interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  notifications?: Record<string, number>;
}

export function BottomNavigation({
  activeTab,
  onTabChange,
  notifications = {}
}: BottomNavigationProps) {
  // Implementation with touch-optimized design
}
```

### SidebarNavigation Component
```typescript
interface SidebarNavigationProps {
  isExpanded: boolean;
  onToggle: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function SidebarNavigation({
  isExpanded,
  onToggle,
  activeSection,
  onSectionChange
}: SidebarNavigationProps) {
  // Implementation with desktop-optimized design
}
```

### ResponsiveLayout Component
```typescript
interface ResponsiveLayoutProps {
  children: React.ReactNode;
  currentSection: string;
  onSectionChange: (section: string) => void;
}

export function ResponsiveLayout({
  children,
  currentSection,
  onSectionChange
}: ResponsiveLayoutProps) {
  // Implementation with responsive navigation switching
}
```

## Testing Strategy

### Mobile Testing
- **Device Testing**: Real device testing on various screen sizes
- **Touch Testing**: Touch interaction testing
- **Gesture Testing**: Swipe gesture testing
- **Performance Testing**: Mobile performance optimization

### Desktop Testing
- **Browser Testing**: Cross-browser compatibility
- **Keyboard Testing**: Full keyboard navigation testing
- **Hover Testing**: Hover interaction testing
- **Responsive Testing**: Breakpoint testing

### Accessibility Testing
- **Screen Reader Testing**: VoiceOver, TalkBack, NVDA
- **Keyboard Navigation**: Full keyboard support testing
- **Color Contrast**: High contrast mode testing
- **WCAG Compliance**: WCAG 2.1 AA compliance testing

## Future Enhancements

### Planned Features
- **Voice Navigation**: Voice command support
- **Gesture Customization**: User-configurable gestures
- **Smart Navigation**: AI-powered navigation suggestions
- **Offline Navigation**: Offline navigation support

### Technical Improvements
- **Performance**: Further performance optimizations
- **Accessibility**: Enhanced accessibility features
- **Customization**: User-customizable navigation
- **Analytics**: Navigation usage analytics

This navigation system ensures a seamless, accessible, and performant navigation experience across all devices while maintaining the mobile-first design philosophy. 