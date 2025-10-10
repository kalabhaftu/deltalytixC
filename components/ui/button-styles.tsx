'use client'

import React from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

/**
 * Button Style Guide and Standardized Components
 * 
 * Primary Actions: Use 'default' variant for main actions (Save, Create, Submit)
 * Secondary Actions: Use 'outline' variant for secondary actions (Cancel, Back)
 * Destructive Actions: Use 'destructive' variant for dangerous actions (Delete, Remove)
 * Ghost Actions: Use 'ghost' variant for subtle actions (Close, Minimize)
 * Link Actions: Use 'link' variant for text-based navigation
 */

interface ActionButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
}

/**
 * Primary action button - for main actions like Save, Create, Submit
 */
export function PrimaryButton({ 
  children, 
  loading = false, 
  loadingText = 'Loading...', 
  disabled,
  className,
  ...props 
}: ActionButtonProps) {
  return (
    <Button
      variant="outline"
      disabled={disabled || loading}
      className={cn('min-w-[100px]', className)}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? loadingText : children}
    </Button>
  )
}

/**
 * Secondary action button - for secondary actions like Cancel, Back
 */
export function SecondaryButton({ 
  children, 
  loading = false, 
  loadingText = 'Loading...', 
  disabled,
  className,
  ...props 
}: ActionButtonProps) {
  return (
    <Button
      variant="outline"
      disabled={disabled || loading}
      className={cn('min-w-[80px]', className)}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? loadingText : children}
    </Button>
  )
}

/**
 * Destructive action button - for dangerous actions like Delete, Remove
 */
export function DestructiveButton({ 
  children, 
  loading = false, 
  loadingText = 'Deleting...', 
  disabled,
  className,
  ...props 
}: ActionButtonProps) {
  return (
    <Button
      variant="destructive"
      disabled={disabled || loading}
      className={cn('min-w-[80px]', className)}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? loadingText : children}
    </Button>
  )
}

/**
 * Icon button with consistent styling
 */
interface IconButtonProps extends ButtonProps {
  icon: React.ReactNode
  label?: string
  tooltip?: string
}

export function IconButton({ 
  icon, 
  label, 
  className, 
  size = 'icon',
  variant = 'ghost',
  ...props 
}: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn('shrink-0', className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </Button>
  )
}

/**
 * Action button group with consistent spacing
 */
interface ActionGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function ActionGroup({ 
  children, 
  className, 
  orientation = 'horizontal' 
}: ActionGroupProps) {
  return (
    <div className={cn(
      'flex',
      orientation === 'horizontal' ? 'flex-row gap-2' : 'flex-col gap-2',
      className
    )}>
      {children}
    </div>
  )
}

/**
 * Form action buttons with consistent layout
 */
interface FormActionsProps {
  onSubmit?: () => void
  onCancel?: () => void
  submitText?: string
  cancelText?: string
  isSubmitting?: boolean
  submitDisabled?: boolean
  className?: string
}

export function FormActions({
  onSubmit,
  onCancel,
  submitText = 'Save',
  cancelText = 'Cancel',
  isSubmitting = false,
  submitDisabled = false,
  className
}: FormActionsProps) {
  return (
    <ActionGroup className={cn('justify-end', className)}>
      {onCancel && (
        <SecondaryButton 
          type="button" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelText}
        </SecondaryButton>
      )}
      {onSubmit && (
        <PrimaryButton
          type="submit"
          onClick={onSubmit}
          loading={isSubmitting}
          disabled={submitDisabled}
          loadingText="Saving..."
        >
          {submitText}
        </PrimaryButton>
      )}
    </ActionGroup>
  )
}

/**
 * CRUD action buttons for tables and cards
 */
interface CrudActionsProps {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  viewText?: string
  editText?: string
  deleteText?: string
  isDeleting?: boolean
  className?: string
  size?: 'sm' | 'default'
}

export function CrudActions({
  onView,
  onEdit,
  onDelete,
  viewText = 'View',
  editText = 'Edit',
  deleteText = 'Delete',
  isDeleting = false,
  className,
  size = 'sm'
}: CrudActionsProps) {
  return (
    <ActionGroup className={className}>
      {onView && (
        <SecondaryButton size={size} onClick={onView}>
          {viewText}
        </SecondaryButton>
      )}
      {onEdit && (
        <SecondaryButton size={size} onClick={onEdit}>
          {editText}
        </SecondaryButton>
      )}
      {onDelete && (
        <DestructiveButton 
          size={size} 
          onClick={onDelete}
          loading={isDeleting}
          loadingText="Deleting..."
        >
          {deleteText}
        </DestructiveButton>
      )}
    </ActionGroup>
  )
}

/**
 * Navigation button for consistent navigation styling
 */
export function NavButton({ 
  children, 
  active = false,
  className,
  ...props 
}: ButtonProps & { active?: boolean }) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'justify-start transition-all duration-200',
        active && 'bg-muted text-foreground',
        !active && 'hover:bg-muted/50',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

