export type PortalIdentity={organizationId:string;clientId:string;active:boolean};
export type PortalResource={organizationId:string;clientId:string;visibility?:'INTERNAL'|'CLIENT_VISIBLE';clientVisible?:boolean};
export function canAccessPortalResource(identity:PortalIdentity,resource:PortalResource){return identity.active&&identity.organizationId===resource.organizationId&&identity.clientId===resource.clientId&&(resource.visibility===undefined||resource.visibility==='CLIENT_VISIBLE')&&(resource.clientVisible===undefined||resource.clientVisible)}
export function canReviewSubmission(identity:PortalIdentity,resource:PortalResource,status:string){return canAccessPortalResource(identity,resource)&&resource.clientVisible===true&&status==='PENDING_REVIEW'}
