export const internalRoles = ['CEO', 'MANAGER', 'TEAM_LEAD', 'EMPLOYEE'] as const;
export type InternalRole = typeof internalRoles[number];

export const rolePermissions: Record<string, readonly string[]> = {
  CEO: ['*'],
  MANAGER: ['organization.view','members.view','members.invite','members.update_role','users.view','users.invite','users.update','teams.view','teams.create','teams.update','teams.members.manage','clients.view','clients.create','clients.update','clients.archive','contacts.manage','campaigns.view','campaigns.create','campaigns.update','campaigns.status','campaigns.teams','tasks.view','tasks.create','tasks.update','tasks.review','submissions.review','analytics.team','reports.team'],
  TEAM_LEAD: ['organization.view','members.view','users.view','teams.view','teams.members.view','clients.view','campaigns.view','tasks.view','tasks.create','tasks.assign','tasks.update','tasks.manage','tasks.status','tasks.progress','tasks.submit','tasks.review','submissions.create','submissions.review','analytics.team.scoped','reports.team'],
  EMPLOYEE: ['profile.view','profile.update','organization.view','teams.view','clients.view','campaigns.view','tasks.view','tasks.status','tasks.progress','tasks.submit','submissions.create','comments.create','analytics.personal','reports.personal'],
  CLIENT: ['profile.view', 'profile.update'],
};

export function hasPermission(role: string, permission: string) {
  const grants = rolePermissions[role] || [];
  return grants.includes('*') || grants.includes(permission);
}

export function canAssignRole(actorRole: string, targetRole: string) {
  if (targetRole === 'CEO' || targetRole === 'CLIENT') return false;
  if (actorRole === 'CEO') return ['MANAGER', 'TEAM_LEAD', 'EMPLOYEE'].includes(targetRole);
  return actorRole === 'MANAGER' && ['TEAM_LEAD', 'EMPLOYEE'].includes(targetRole);
}

export function isManagement(role: string) { return role === 'CEO' || role === 'MANAGER'; }
