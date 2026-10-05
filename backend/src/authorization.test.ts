import {describe, expect, it} from 'vitest';
import {canAssignRole, hasPermission} from './authorization.js';
describe('role authorization', () => {
  it('gives the CEO organization-wide access', () => expect(hasPermission('CEO', 'organization.update')).toBe(true));
  it('does not grant employees management access', () => expect(hasPermission('EMPLOYEE', 'members.invite')).toBe(false));
  it('limits manager role assignment', () => { expect(canAssignRole('MANAGER', 'TEAM_LEAD')).toBe(true); expect(canAssignRole('MANAGER', 'MANAGER')).toBe(false); });
  it('never permits invitation-based CEO creation', () => expect(canAssignRole('CEO', 'CEO')).toBe(false));
});
