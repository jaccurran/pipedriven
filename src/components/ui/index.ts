/**
 * UI Component Library Index
 * 
 * This file exports all core UI components for easy importing throughout the application.
 * Components are organized by category and follow the design system specifications.
 */

// Core UI Components
export { Button } from './Button';
export { Card } from './Card';
export { Badge } from './Badge';
export { Modal } from './Modal';
export { Slideover } from './Slideover';
export { Input } from './Input';
export { Select } from './Select';
export { Textarea } from './Textarea';
export { DatePicker } from './DatePicker';
export { Toast } from './Toast';
export { ErrorBoundary } from './ErrorBoundary';
export { LazyLoad } from './LazyLoad';
export { VirtualList } from './VirtualList';
export { Breadcrumb } from './Breadcrumb';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';
export { Label } from './Label';

// Layout Components
export { DashboardLayout } from '../layout/DashboardLayout';
export { Navigation } from '../layout/Navigation';

// Feature Components
export { CampaignList } from '../campaigns/CampaignList';
export { CampaignKanban } from '../campaigns/CampaignKanban';
export { CampaignCard } from '../campaigns/CampaignCard';
export { ContactCard } from '../contacts/ContactCard';
export { CampaignForm } from '../campaigns/CampaignForm';
export { NewCampaignForm } from '../campaigns/NewCampaignForm';

export { ContactList } from '../contacts/ContactList';

export { DashboardOverview } from '../dashboard/DashboardOverview';

export { AnalyticsDashboard } from '../analytics/AnalyticsDashboard';

// Types
export type { ButtonProps } from './Button';
export type { CardProps } from './Card';
export type { BadgeProps } from './Badge';
export type { ModalProps } from './Modal';
export type { SlideoverProps } from './Slideover';
export type { InputProps } from './Input';
export type { SelectProps } from './Select';
export type { DatePickerProps } from './DatePicker';
export type { ToastProps } from './Toast'; 