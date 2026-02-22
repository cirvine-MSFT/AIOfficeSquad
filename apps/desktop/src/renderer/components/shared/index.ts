/**
 * Re-export all shared components and their helpers.
 */
export { default as Breadcrumb } from './Breadcrumb'
export type { BreadcrumbProps } from './Breadcrumb'

export { default as RoleAvatar } from './RoleAvatar'
export type { RoleAvatarProps } from './RoleAvatar'
export { getInitials, getRoleKey, getAvatarBg, getRoleLabel, getRoleTextColor } from './RoleAvatar'

export { default as StatusDot } from './StatusDot'
export type { StatusDotProps } from './StatusDot'
export { STATUS_LABELS, STATUS_BADGE_CLASSES } from './StatusDot'
