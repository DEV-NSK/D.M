import {describe,expect,it} from 'vitest';import {canAccessPortalResource,canReviewSubmission} from './portalRules.js';
const client={organizationId:'org-a',clientId:'client-a',active:true};
describe('client portal authorization boundaries',()=>{
 it('allows only active matching tenant and client resources',()=>{expect(canAccessPortalResource(client,{organizationId:'org-a',clientId:'client-a',visibility:'CLIENT_VISIBLE'})).toBe(true);expect(canAccessPortalResource({...client,active:false},{organizationId:'org-a',clientId:'client-a',visibility:'CLIENT_VISIBLE'})).toBe(false)});
 it('rejects cross-tenant and cross-client access',()=>{expect(canAccessPortalResource(client,{organizationId:'org-b',clientId:'client-a',visibility:'CLIENT_VISIBLE'})).toBe(false);expect(canAccessPortalResource(client,{organizationId:'org-a',clientId:'client-b',visibility:'CLIENT_VISIBLE'})).toBe(false)});
 it('never exposes internal resources',()=>expect(canAccessPortalResource(client,{organizationId:'org-a',clientId:'client-a',visibility:'INTERNAL'})).toBe(false));
 it('reviews only visible pending submissions',()=>{expect(canReviewSubmission(client,{organizationId:'org-a',clientId:'client-a',visibility:'CLIENT_VISIBLE',clientVisible:true},'PENDING_REVIEW')).toBe(true);expect(canReviewSubmission(client,{organizationId:'org-a',clientId:'client-a',visibility:'CLIENT_VISIBLE',clientVisible:false},'PENDING_REVIEW')).toBe(false);expect(canReviewSubmission(client,{organizationId:'org-a',clientId:'client-a',visibility:'CLIENT_VISIBLE',clientVisible:true},'APPROVED')).toBe(false)});
});
