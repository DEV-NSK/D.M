import {describe, expect, it} from 'vitest';
import {canAssignRole, hasPermission} from './authorization.js';
describe('role authorization', () => {
  it('gives the CEO organization-wide access', () => expect(hasPermission('CEO', 'organization.update')).toBe(true));
  it('does not grant employees management access', () => expect(hasPermission('EMPLOYEE', 'members.invite')).toBe(false));
  it('limits manager role assignment', () => { expect(canAssignRole('MANAGER', 'TEAM_LEAD')).toBe(true); expect(canAssignRole('MANAGER', 'MANAGER')).toBe(false); });
  it('never permits invitation-based CEO creation', () => expect(canAssignRole('CEO', 'CEO')).toBe(false));
  it('keeps organization administration CEO-only', () => {
    expect(hasPermission('CEO', 'organization.update')).toBe(true);
    for (const role of ['MANAGER', 'TEAM_LEAD', 'EMPLOYEE']) expect(hasPermission(role, 'organization.update')).toBe(false);
  });
  it('gives employees execution permissions without management permissions', () => {
    expect(hasPermission('EMPLOYEE', 'tasks.view')).toBe(true);
    expect(hasPermission('EMPLOYEE', 'tasks.status')).toBe(true);
    expect(hasPermission('EMPLOYEE', 'tasks.create')).toBe(false);
    expect(hasPermission('EMPLOYEE', 'teams.create')).toBe(false);
    expect(hasPermission('EMPLOYEE', 'members.view')).toBe(false);
  });
  it('gives team leads team execution but not organization controls', () => {
    expect(hasPermission('TEAM_LEAD', 'tasks.assign')).toBe(true);
    expect(hasPermission('TEAM_LEAD', 'analytics.team.scoped')).toBe(true);
    expect(hasPermission('TEAM_LEAD', 'teams.create')).toBe(false);
    expect(hasPermission('TEAM_LEAD', 'organization.update')).toBe(false);
  });
});
