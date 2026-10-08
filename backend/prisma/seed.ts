import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();
const password = 'Demo123!';
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);
const daysAgo = (days: number) => daysFromNow(-days);

async function addFullDemoData(organizationId: string, passwordHash: string) {
  const alreadyAdded = await db.activityLog.findFirst({ where: { organizationId, action: 'FULL_DEMO_DATA_V2' } });
  if (alreadyAdded) {
    console.log('Full demo dataset already exists; nothing more to add.');
    return;
  }

  const baseMemberships = await db.membership.findMany({ where: { organizationId }, include: { user: true } });
  const ceo = baseMemberships.find(x => x.role === 'CEO')!.user;
  const primaryManager = baseMemberships.find(x => x.role === 'MANAGER')!.user;

  const staffSpecs: Array<[string, string, string, Role]> = [
    ['Vikram Malhotra', 'manager.growth@demo.dm', 'Growth Director', Role.MANAGER],
    ['Nisha Kapoor', 'manager.accounts@demo.dm', 'Client Services Manager', Role.MANAGER],
    ['Arjun Nair', 'lead.performance@demo.dm', 'Performance Marketing Lead', Role.TEAM_LEAD],
    ['Meera Joshi', 'lead.content@demo.dm', 'Content Strategy Lead', Role.TEAM_LEAD],
    ['Dev Khanna', 'lead.web@demo.dm', 'Web Experience Lead', Role.TEAM_LEAD],
    ['Ishita Bose', 'seo@demo.dm', 'SEO Specialist', Role.EMPLOYEE],
    ['Aditya Kulkarni', 'paid-media@demo.dm', 'Paid Media Specialist', Role.EMPLOYEE],
    ['Tara Menon', 'copywriter@demo.dm', 'Senior Copywriter', Role.EMPLOYEE],
    ['Rahul Das', 'video@demo.dm', 'Video Editor', Role.EMPLOYEE],
    ['Sneha Reddy', 'social@demo.dm', 'Social Media Executive', Role.EMPLOYEE],
    ['Farhan Ali', 'developer@demo.dm', 'Web Developer', Role.EMPLOYEE],
    ['Pooja Sethi', 'email@demo.dm', 'Email Marketing Specialist', Role.EMPLOYEE],
    ['Karan Bhat', 'analyst@demo.dm', 'Marketing Analyst', Role.EMPLOYEE],
    ['Diya Roy', 'account-exec@demo.dm', 'Account Executive', Role.EMPLOYEE],
    ['Manav Jain', 'researcher@demo.dm', 'Market Researcher', Role.EMPLOYEE],
    ['Riya Sen', 'brand@demo.dm', 'Brand Strategist', Role.EMPLOYEE],
    ['Aman Gupta', 'community@demo.dm', 'Community Manager', Role.EMPLOYEE],
  ];
  const staff: Array<{ user: any; role: Role }> = [];
  for (const [name, email, jobTitle, role] of staffSpecs) {
    const user = await db.user.create({ data: { name, email, jobTitle, passwordHash, timezone: 'Asia/Kolkata', phone: `+91 98${String(10000000 + staff.length).padStart(8, '0')}`, bio: `${jobTitle} in the full demo workspace.` } });
    const reportsToId = role === Role.MANAGER ? ceo.id : role === Role.TEAM_LEAD ? primaryManager.id : null;
    await db.membership.create({ data: { organizationId, userId: user.id, role, reportsToId } });
    staff.push({ user, role });
  }
  const managers = [primaryManager, ...staff.filter(x => x.role === Role.MANAGER).map(x => x.user)];
  const leads = [...baseMemberships.filter(x => x.role === 'TEAM_LEAD').map(x => x.user), ...staff.filter(x => x.role === Role.TEAM_LEAD).map(x => x.user)];
  const employees = [...baseMemberships.filter(x => x.role === 'EMPLOYEE').map(x => x.user), ...staff.filter(x => x.role === Role.EMPLOYEE).map(x => x.user)];
  for (let i = 0; i < employees.length; i++) {
    await db.membership.update({ where: { userId_organizationId: { userId: employees[i].id, organizationId } }, data: { reportsToId: leads[i % leads.length].id } });
  }

  const teamSpecs = [
    ['Content & Copy', 'Editorial strategy, copywriting, and content production.'],
    ['Performance Marketing', 'Paid media, conversion optimization, and acquisition.'],
    ['SEO & Analytics', 'Organic growth, research, measurement, and insights.'],
    ['Web Experience', 'Web development, landing pages, and user experience.'],
    ['Social & Community', 'Social publishing, community, and influencer programs.'],
    ['Client Success', 'Account coordination, reporting, and client communication.'],
  ];
  const teams: any[] = [];
  for (let i = 0; i < teamSpecs.length; i++) {
    const team = await db.team.create({ data: { organizationId, name: teamSpecs[i][0], description: teamSpecs[i][1], managerId: managers[i % managers.length].id, teamLeadId: leads[i % leads.length].id } });
    teams.push(team);
    const members = [leads[i % leads.length], ...employees.filter((_, n) => n % teams.length === i % teams.length).slice(0, 4)];
    await db.teamMember.createMany({ data: members.map(user => ({ teamId: team.id, userId: user.id })), skipDuplicates: true });
  }

  const clientSpecs = [
    ['Urban Thread', 'Fashion & Apparel', 'Delhi', 'ACTIVE'],
    ['GreenBite Foods', 'Food & Beverage', 'Pune', 'ACTIVE'],
    ['FinEdge Advisory', 'Financial Services', 'Mumbai', 'ACTIVE'],
    ['CloudNova Systems', 'B2B Technology', 'Hyderabad', 'ACTIVE'],
    ['WanderNest Travel', 'Travel & Hospitality', 'Goa', 'ACTIVE'],
    ['HomeCraft Living', 'Home & Lifestyle', 'Jaipur', 'INACTIVE'],
  ] as const;
  const clients: any[] = [];
  for (let i = 0; i < clientSpecs.length; i++) {
    const [name, industry, city, status] = clientSpecs[i];
    const client = await db.client.create({ data: { organizationId, name, companyName: `${name} Pvt Ltd`, industry, city, state: 'India', countryCode: 'IN', primaryEmail: `hello@${name.toLowerCase().replace(/[^a-z]/g, '')}.example`, primaryPhone: `+91 97${String(20000000 + i).padStart(8, '0')}`, websiteUrl: `https://${name.toLowerCase().replace(/[^a-z]/g, '')}.example`, status, ownerUserId: managers[i % managers.length].id, createdBy: ceo.id, notes: 'Rich demo client record with campaigns, contacts, and activity.' } });
    clients.push(client);
    await db.clientContact.createMany({ data: [
      { organizationId, clientId: client.id, name: `${['Aditi', 'Sameer', 'Lavanya', 'Yash', 'Zoya', 'Harsh'][i]} ${name.split(' ')[0]}`, email: `marketing@${name.toLowerCase().replace(/[^a-z]/g, '')}.example`, jobTitle: 'Marketing Head', isPrimary: true },
      { organizationId, clientId: client.id, name: `Operations Team`, email: `operations@${name.toLowerCase().replace(/[^a-z]/g, '')}.example`, jobTitle: 'Operations Coordinator' },
    ] });
    await db.clientActivity.createMany({ data: [
      { organizationId, clientId: client.id, actorUserId: managers[i % managers.length].id, activityType: 'CLIENT_CREATED', description: `${name} was added to the workspace`, createdAt: daysAgo(110 - i * 7) },
      { organizationId, clientId: client.id, actorUserId: employees[i % employees.length].id, activityType: 'NOTE_ADDED', description: 'Quarterly goals and audience notes were updated', createdAt: daysAgo(12 - i) },
    ] });
  }

  const campaignTypes = ['SOCIAL_MEDIA', 'SEO', 'PAID_ADVERTISING', 'CONTENT_MARKETING', 'EMAIL_MARKETING', 'BRANDING', 'WEBSITE', 'INFLUENCER_MARKETING', 'OTHER'] as const;
  const campaignStatuses = ['DRAFT', 'PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const;
  const campaigns: any[] = [];
  for (let i = 0; i < 24; i++) {
    const client = clients[i % clients.length], team = teams[i % teams.length];
    const type = campaignTypes[i % campaignTypes.length], status = campaignStatuses[i % campaignStatuses.length];
    const name = `${client.name} ${['Awareness Wave', 'Growth Sprint', 'Conversion Drive', 'Launch Story'][i % 4]} ${i + 1}`;
    const campaign = await db.campaign.create({ data: { organizationId, clientId: client.id, name, slug: `full-demo-campaign-${i + 1}`, description: `A complete ${type.toLowerCase().replaceAll('_', ' ')} demonstration campaign.`, campaignType: type, status, objectiveSummary: 'Grow reach, engagement, qualified leads, and conversion efficiency.', startDate: daysAgo(120 - i * 4), endDate: daysFromNow(-45 + i * 6), budgetAmount: 100000 + i * 25000, currencyCode: 'INR', createdBy: managers[i % managers.length].id, updatedBy: managers[i % managers.length].id, archivedAt: status === 'CANCELLED' && i % 2 ? daysAgo(5) : null } });
    campaigns.push(campaign);
    await db.campaignObjective.createMany({ data: [
      { organizationId, campaignId: campaign.id, title: 'Qualified reach', metricType: 'REACH', targetValue: 100000 + i * 5000, unit: 'people' },
      { organizationId, campaignId: campaign.id, title: 'Lead generation', metricType: 'LEADS', targetValue: 250 + i * 10, unit: 'leads' },
      { organizationId, campaignId: campaign.id, title: 'Conversion efficiency', metricType: 'CONVERSION_RATE', targetValue: 4 + (i % 5), unit: '%' },
    ] });
    await db.campaignTeamAssignment.create({ data: { organizationId, campaignId: campaign.id, teamId: team.id, assignmentRole: 'PRIMARY', assignedBy: managers[i % managers.length].id } });
    if (i % 3 === 0) await db.campaignTeamAssignment.create({ data: { organizationId, campaignId: campaign.id, teamId: teams[(i + 1) % teams.length].id, assignmentRole: 'SUPPORTING', assignedBy: managers[i % managers.length].id } });
    await db.campaignActivity.createMany({ data: [
      { organizationId, campaignId: campaign.id, actorUserId: managers[i % managers.length].id, activityType: 'CAMPAIGN_CREATED', description: `${name} was created`, createdAt: daysAgo(60 - i) },
      { organizationId, campaignId: campaign.id, actorUserId: leads[i % leads.length].id, activityType: 'STATUS_CHANGED', description: `Campaign moved to ${status.toLowerCase()}`, createdAt: daysAgo(20 - Math.min(i, 18)) },
    ] });
  }

  const taskTypes = ['CONTENT_CREATION', 'SOCIAL_MEDIA', 'GRAPHIC_DESIGN', 'VIDEO_EDITING', 'COPYWRITING', 'SEO', 'PAID_ADVERTISING', 'EMAIL_MARKETING', 'WEB_DEVELOPMENT', 'RESEARCH', 'CLIENT_COMMUNICATION', 'OTHER'] as const;
  const taskStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'REVISION_REQUIRED', 'COMPLETED', 'CANCELLED'] as const;
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
  const taskNouns = ['Audience research', 'Creative concepts', 'Landing page', 'Campaign copy', 'Weekly optimization', 'Performance analysis', 'Social calendar', 'Email sequence', 'Ad variants', 'Client presentation'];
  const tasks: any[] = [];
  for (let i = 0; i < 96; i++) {
    const campaign = campaigns[i % campaigns.length], team = teams[i % teams.length], assignee = employees[i % employees.length];
    const status = taskStatuses[i % taskStatuses.length], visible = i % 3 === 0;
    const progress = status === 'TODO' ? 0 : status === 'COMPLETED' ? 100 : status === 'CANCELLED' ? 15 : 25 + (i % 4) * 20;
    const task = await db.task.create({ data: { organizationId, campaignId: campaign.id, teamId: team.id, title: `${taskNouns[i % taskNouns.length]} — ${campaign.name}`, description: 'Complete demo task with ownership, checklist, discussion, activity history, due date, and workload estimate.', taskType: taskTypes[i % taskTypes.length], priority: priorities[i % priorities.length], status, progressPercentage: progress, startDate: daysAgo(35 - (i % 25)), dueDate: daysFromNow((i % 31) - 12), estimatedHours: 3 + (i % 18), createdBy: leads[i % leads.length].id, updatedBy: leads[i % leads.length].id, completedAt: status === 'COMPLETED' ? daysAgo(i % 10) : null, visibility: visible ? 'CLIENT_VISIBLE' : 'INTERNAL', requiresClientReview: visible } });
    tasks.push(task);
    await db.taskAssignee.createMany({ data: [
      { organizationId, taskId: task.id, userId: assignee.id, assignmentType: 'PRIMARY', assignedBy: leads[i % leads.length].id },
      ...(i % 4 === 0 ? [{ organizationId, taskId: task.id, userId: employees[(i + 1) % employees.length].id, assignmentType: 'COLLABORATOR' as const, assignedBy: leads[i % leads.length].id }] : []),
    ] });
    await db.taskSubtask.createMany({ data: ['Confirm requirements', 'Create working draft', 'Run quality assurance', 'Prepare final handoff'].map((title, n) => ({ organizationId, taskId: task.id, title, description: `Step ${n + 1} of the workflow`, position: n + 1, completed: progress >= (n + 1) * 25, completedAt: progress >= (n + 1) * 25 ? daysAgo(8 - n) : null, createdBy: leads[i % leads.length].id })) });
    await db.taskComment.createMany({ data: [
      { organizationId, taskId: task.id, authorId: assignee.id, content: 'Initial work is underway; notes and source material have been reviewed.', visibility: visible ? 'CLIENT_VISIBLE' : 'INTERNAL', createdAt: daysAgo(7) },
      { organizationId, taskId: task.id, authorId: leads[i % leads.length].id, content: 'Please keep the final output aligned with the campaign objective and brand voice.', visibility: 'INTERNAL', createdAt: daysAgo(5) },
    ] });
    await db.taskActivity.createMany({ data: [
      { organizationId, taskId: task.id, actorUserId: leads[i % leads.length].id, activityType: 'TASK_CREATED', description: 'Task created and assigned', createdAt: daysAgo(14) },
      { organizationId, taskId: task.id, actorUserId: assignee.id, activityType: 'STATUS_CHANGED', description: `Task moved to ${status.toLowerCase().replaceAll('_', ' ')}`, createdAt: daysAgo(i % 7) },
    ] });
  }

  const clientUsers = baseMemberships.filter(x => x.role === 'CLIENT').map(x => x.user);
  const reviewable = tasks.filter((_, i) => i % 3 === 0).slice(0, 24);
  for (let i = 0; i < reviewable.length; i++) {
    const task = reviewable[i], reviewState = i % 3;
    const submission = await db.taskSubmission.create({ data: { organizationId, taskId: task.id, submittedBy: employees[i % employees.length].id, submissionNumber: 1, description: `Client-ready submission package version 1 for ${task.title}.`, status: reviewState === 0 ? 'PENDING_REVIEW' : reviewState === 1 ? 'APPROVED' : 'REVISION_REQUIRED', reviewComment: reviewState === 1 ? 'Approved for publication.' : reviewState === 2 ? 'Please adjust the headline and final CTA.' : null, reviewedBy: reviewState ? clientUsers[0].id : null, reviewedAt: reviewState ? daysAgo(i % 5) : null, clientVisible: true } });
    await db.taskDeliverable.create({ data: { organizationId, taskId: task.id, submissionId: submission.id, uploadedBy: employees[i % employees.length].id, fileName: `campaign-deliverable-${i + 1}.${i % 2 ? 'pdf' : 'png'}`, fileSize: 450000 + i * 125000, mimeType: i % 2 ? 'application/pdf' : 'image/png', storageKey: `demo/full/campaign-deliverable-${i + 1}` } });
    if (reviewState) await db.clientReview.create({ data: { organizationId, clientId: (await db.campaign.findUnique({ where: { id: task.campaignId } }))!.clientId, taskId: task.id, submissionId: submission.id, reviewerId: clientUsers[0].id, status: reviewState === 1 ? 'APPROVED' : 'CHANGES_REQUESTED', comment: reviewState === 1 ? 'Approved for publication.' : 'Please adjust the headline and final CTA.' } });
  }

  await db.notification.createMany({ data: [...employees.slice(0, 10).map((user, i) => ({ organizationId, recipientId: user.id, type: i % 2 ? 'TASK_ASSIGNED' : 'COMMENT_ADDED', title: i % 2 ? 'A new task was assigned' : 'New feedback received', message: `Demo notification ${i + 1}: review the latest campaign update.`, entityType: 'task', entityId: tasks[i].id, readAt: i % 3 === 0 ? daysAgo(1) : null, createdAt: daysAgo(i % 6) })), ...managers.map((user, i) => ({ organizationId, recipientId: user.id, type: 'DEADLINE_ALERT', title: 'Campaign deadline approaching', message: 'Several active tasks require attention this week.', entityType: 'campaign', entityId: campaigns[i].id, createdAt: daysAgo(i) }))] });
  await db.report.createMany({ data: [
    { organizationId, createdBy: ceo.id, name: 'Full portfolio executive dashboard', type: 'MONTHLY_ORGANIZATION', filters: { days: 90, status: 'ALL' } },
    { organizationId, createdBy: managers[0].id, name: 'Campaign delivery health', type: 'CAMPAIGN', filters: { days: 30 } },
    { organizationId, createdBy: managers[1].id, name: 'Client portfolio summary', type: 'CLIENT', filters: { days: 90 } },
    { organizationId, createdBy: leads[0].id, name: 'Team workload and completion', type: 'TEAM', filters: { days: 30 } },
    { organizationId, createdBy: leads[1].id, name: 'Task deadline analysis', type: 'TASK', filters: { overdue: true } },
  ] });
  await db.activityLog.createMany({ data: [
    ...campaigns.slice(0, 12).map((campaign, i) => ({ organizationId, actorUserId: managers[i % managers.length].id, action: i % 2 ? 'CAMPAIGN_UPDATED' : 'CAMPAIGN_CREATED', entityType: 'campaign', entityId: campaign.id, metadata: { demo: true }, createdAt: daysAgo(i) })),
    { organizationId, actorUserId: ceo.id, action: 'FULL_DEMO_DATA_V2', entityType: 'organization', entityId: organizationId, metadata: { managers: managers.length, leads: leads.length, employees: employees.length, campaigns: campaigns.length, tasks: tasks.length } },
  ] });
  console.log(`Full demo data added: ${staff.length} staff, ${teams.length} teams, ${clients.length} clients, ${campaigns.length} campaigns, and ${tasks.length} tasks.`);
}

async function seedComOnboarding(organizationId:string,createdBy:string){
  if(await db.sopTemplate.findFirst({where:{organizationId,name:'COM Client Onboarding',version:1}}))return;
  const teams=await db.team.findMany({where:{organizationId,status:'ACTIVE'}}),fallback=teams[0];if(!fallback)return;
  const find=(words:string[])=>teams.find(t=>words.some(w=>t.name.toLowerCase().includes(w)))||fallback;
  const activityDays=[
    ['Call With COM Sales Team','WhatsApp Group Creation','Create Project Board','Call With Client','MOM & Timeline Preparation','Internal Team Discussion','Shoot Schedule Confirmation'],
    ['Brand Guidelines Collection','End Card Design','Mood Board Design','Digital Marketing Plan','Competitor Research'],
    ['Marketing Strategy','Social Account Access','Instagram Profile Setup','Facebook Page Setup','Content Calendar Preparation','Account Audit'],
    ['Ad Creatives','Ad Creatives Approval','AD Scheduling','Shoot Schedule','Client Approval Follow-up'],
    ['Reels/Posters Upload','Caption and Hashtag Review','Content Approval','Publishing Schedule'],
    ['Shoot Data Sorting','Shoot Data Assignment','Edit Queue Preparation','Pending Task Follow-ups'],
    ['First Week Meeting Schedule Confirmation','Performance Snapshot','Open Hurdles Review'],
    ['First Week Client Meeting','Report Submission — Client','Report Submission — COM','Hurdle Resolution and Next Week Plan']
  ];
  const template=await db.sopTemplate.create({data:{organizationId,name:'COM Client Onboarding',description:'Week 1 operational onboarding workflow derived from the COM onboarding SOP sheet.',version:1,status:'ACTIVE',createdBy}});
  for(let di=0;di<activityDays.length;di++){const day=await db.sopTemplateDay.create({data:{sopTemplateId:template.id,dayNumber:di+1,title:`Day ${di+1}`}});for(let ti=0;ti<activityDays[di].length;ti++){const title=activityDays[di][ti],client=/Client|Approval/.test(title),report=/Plan|Research|Report|Guideline|Mood Board|Creative/.test(title);await db.sopTemplateTask.create({data:{sopTemplateDayId:day.id,title,sequenceOrder:ti+1,responsibilityType:client?'SHARED':'INTERNAL',responsibilityTeamId:/creative|design|reel|poster|edit/i.test(title)?find(['content','social']).id:/shoot/i.test(title)?find(['social','client']).id:find(['client','performance']).id,sourceType:client?'COM_AND_CLIENT':'COM',operationalLabel:client?'COM & Client Approval':'From COM',defaultPriority:/Approval|Hurdle|Follow-up/.test(title)?'HIGH':'MEDIUM',estimatedDurationSeconds:3600,requiresDeliverable:report,approvalType:/Approval/.test(title)?'CLIENT':report?'INTERNAL':'NONE',clientVisible:client}})}}
}

async function run() {
  const existing = await db.organization.findUnique({ where: { slug: 'nsk-digital-demo' } });
  if (existing) {
    const owner = await db.membership.findFirst({ where: { organizationId: existing.id, role: 'CEO' }, include: { user: true } });
    await addFullDemoData(existing.id, owner!.user.passwordHash);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const users = await Promise.all([
    ['Aarav Mehta', 'ceo@demo.dm', 'Founder & CEO', Role.CEO],
    ['Priya Sharma', 'manager@demo.dm', 'Marketing Manager', Role.MANAGER],
    ['Rohan Verma', 'lead@demo.dm', 'Creative Team Lead', Role.TEAM_LEAD],
    ['Ananya Iyer', 'employee@demo.dm', 'Content Specialist', Role.EMPLOYEE],
    ['Kabir Singh', 'designer@demo.dm', 'Visual Designer', Role.EMPLOYEE],
    ['Maya Patel', 'client@demo.dm', 'Brand Director', Role.CLIENT],
    ['Neel Shah', 'client.member@demo.dm', 'Marketing Coordinator', Role.CLIENT],
  ].map(async ([name, email, jobTitle, role]) => ({
    role: role as Role,
    user: await db.user.create({ data: { name: name as string, email: email as string, jobTitle: jobTitle as string, passwordHash, timezone: 'Asia/Kolkata', bio: `Demo ${String(role).toLowerCase().replace('_', ' ')} account.` } }),
  })));
  const byRole = (role: Role) => users.find(x => x.role === role)!.user;
  const ceo = byRole(Role.CEO), manager = byRole(Role.MANAGER), lead = byRole(Role.TEAM_LEAD);
  const employee = users.find(x => x.user.email === 'employee@demo.dm')!.user;
  const designer = users.find(x => x.user.email === 'designer@demo.dm')!.user;
  const clientAdmin = users.find(x => x.user.email === 'client@demo.dm')!.user;
  const clientMember = users.find(x => x.user.email === 'client.member@demo.dm')!.user;

  const org = await db.organization.create({ data: { name: 'NSK Digital Demo', slug: 'nsk-digital-demo', industry: 'Digital Marketing', currency: 'INR', timezone: 'Asia/Kolkata' } });
  for (const { user, role } of users) {
    const reportsToId = role === Role.MANAGER ? ceo.id : role === Role.TEAM_LEAD ? manager.id : role === Role.EMPLOYEE ? lead.id : role === Role.CLIENT ? manager.id : null;
    await db.membership.create({ data: { userId: user.id, organizationId: org.id, role, reportsToId } });
  }

  const creative = await db.team.create({ data: { organizationId: org.id, name: 'Creative Studio', description: 'Content, design, and video production.', managerId: manager.id, teamLeadId: lead.id } });
  const growth = await db.team.create({ data: { organizationId: org.id, name: 'Growth Marketing', description: 'Paid media, SEO, email, and analytics.', managerId: manager.id, teamLeadId: lead.id } });
  await db.teamMember.createMany({ data: [lead, employee, designer].flatMap(user => [{ teamId: creative.id, userId: user.id }]).concat([{ teamId: growth.id, userId: lead.id }, { teamId: growth.id, userId: employee.id }]) });

  const acme = await db.client.create({ data: { organizationId: org.id, name: 'Acme Wellness', companyName: 'Acme Wellness Pvt Ltd', industry: 'Health & Wellness', websiteUrl: 'https://example.com', primaryEmail: 'hello@acme.example', primaryPhone: '+91 98765 43210', city: 'Bengaluru', state: 'Karnataka', countryCode: 'IN', timezone: 'Asia/Kolkata', status: 'ACTIVE', ownerUserId: manager.id, createdBy: ceo.id, notes: 'Flagship retainer client used for the complete demo workflow.' } });
  const northstar = await db.client.create({ data: { organizationId: org.id, name: 'Northstar Learning', companyName: 'Northstar Learning Labs', industry: 'Education', primaryEmail: 'team@northstar.example', city: 'Mumbai', countryCode: 'IN', status: 'INACTIVE', ownerUserId: manager.id, createdBy: ceo.id } });
  await db.clientContact.createMany({ data: [
    { organizationId: org.id, clientId: acme.id, name: 'Maya Patel', email: clientAdmin.email, jobTitle: 'Brand Director', isPrimary: true },
    { organizationId: org.id, clientId: acme.id, name: 'Neel Shah', email: clientMember.email, jobTitle: 'Marketing Coordinator' },
    { organizationId: org.id, clientId: northstar.id, name: 'Sana Rao', email: 'sana@northstar.example', jobTitle: 'Founder', isPrimary: true },
  ] });
  await db.clientMembership.createMany({ data: [
    { organizationId: org.id, clientId: acme.id, userId: clientAdmin.id, role: 'CLIENT_ADMIN' },
    { organizationId: org.id, clientId: acme.id, userId: clientMember.id, role: 'CLIENT_MEMBER' },
  ] });

  const campaignData = [
    ['Summer Wellness Launch', 'summer-wellness-launch', 'SOCIAL_MEDIA', 'ACTIVE', acme.id, creative.id],
    ['Search Growth Sprint', 'search-growth-sprint', 'SEO', 'PLANNED', acme.id, growth.id],
    ['Back to School 2026', 'back-to-school-2026', 'PAID_ADVERTISING', 'DRAFT', northstar.id, growth.id],
    ['Brand Refresh', 'brand-refresh', 'BRANDING', 'COMPLETED', acme.id, creative.id],
  ] as const;
  const campaigns: any[] = [];
  for (const [name, slug, campaignType, status, clientId, teamId] of campaignData) {
    const c = await db.campaign.create({ data: { organizationId: org.id, clientId, name, slug, description: `Demo ${campaignType.toLowerCase().replaceAll('_', ' ')} campaign with realistic activity.`, campaignType, status, objectiveSummary: 'Increase qualified engagement and measurable brand growth.', startDate: daysAgo(status === 'COMPLETED' ? 75 : 14), endDate: daysFromNow(status === 'COMPLETED' ? -15 : 45), budgetAmount: status === 'DRAFT' ? 150000 : 300000, currencyCode: 'INR', createdBy: manager.id, updatedBy: manager.id } });
    campaigns.push(c);
    await db.campaignObjective.createMany({ data: [
      { organizationId: org.id, campaignId: c.id, title: 'Increase engagement', description: 'Improve qualified audience interactions.', metricType: 'ENGAGEMENT_RATE', targetValue: 8, unit: '%' },
      { organizationId: org.id, campaignId: c.id, title: 'Generate conversions', metricType: 'CONVERSIONS', targetValue: 500, unit: 'leads' },
    ] });
    await db.campaignTeamAssignment.create({ data: { organizationId: org.id, campaignId: c.id, teamId, assignmentRole: 'PRIMARY', assignedBy: manager.id } });
    await db.campaignActivity.create({ data: { organizationId: org.id, campaignId: c.id, actorUserId: manager.id, activityType: 'CAMPAIGN_CREATED', description: `${name} was created` } });
  }

  const taskSpecs = [
    ['Create launch carousel', 'CONTENT_CREATION', 'URGENT', 'IN_PROGRESS', 55, creative.id, employee.id, true, 3],
    ['Design campaign key visual', 'GRAPHIC_DESIGN', 'HIGH', 'IN_REVIEW', 90, creative.id, designer.id, true, 1],
    ['Produce product reel', 'VIDEO_EDITING', 'HIGH', 'REVISION_REQUIRED', 75, creative.id, designer.id, true, -1],
    ['Publish launch announcement', 'SOCIAL_MEDIA', 'MEDIUM', 'TODO', 0, creative.id, employee.id, false, 7],
    ['Optimize landing page', 'SEO', 'MEDIUM', 'COMPLETED', 100, growth.id, employee.id, false, -5],
    ['Prepare monthly performance report', 'RESEARCH', 'LOW', 'COMPLETED', 100, growth.id, lead.id, true, -2],
    ['Cancelled influencer outreach', 'INFLUENCER_MARKETING', 'LOW', 'CANCELLED', 10, creative.id, employee.id, false, 12],
  ] as const;
  const tasks: any[] = [];
  for (let i = 0; i < taskSpecs.length; i++) {
    const [title, taskType, priority, status, progressPercentage, teamId, assigneeId, review, due] = taskSpecs[i];
    const task = await db.task.create({ data: { organizationId: org.id, campaignId: campaigns[i < 4 ? 0 : i < 6 ? 1 : 2].id, teamId, title, description: `Detailed demo brief for ${title.toLowerCase()}.`, taskType: taskType === 'INFLUENCER_MARKETING' ? 'OTHER' : taskType, priority, status, progressPercentage, startDate: daysAgo(10), dueDate: daysFromNow(due), estimatedHours: 8 + i * 2, createdBy: lead.id, updatedBy: lead.id, completedAt: status === 'COMPLETED' ? daysAgo(2) : null, visibility: review ? 'CLIENT_VISIBLE' : 'INTERNAL', requiresClientReview: review } });
    tasks.push(task);
    await db.taskAssignee.create({ data: { organizationId: org.id, taskId: task.id, userId: assigneeId, assignmentType: 'PRIMARY', assignedBy: lead.id } });
    await db.taskSubtask.createMany({ data: [
      { organizationId: org.id, taskId: task.id, title: 'Review the brief', completed: true, position: 1, createdBy: lead.id, completedAt: daysAgo(8) },
      { organizationId: org.id, taskId: task.id, title: 'Prepare first draft', completed: progressPercentage >= 50, position: 2, createdBy: lead.id, completedAt: progressPercentage >= 50 ? daysAgo(4) : null },
      { organizationId: org.id, taskId: task.id, title: 'Complete quality check', completed: progressPercentage === 100, position: 3, createdBy: lead.id, completedAt: progressPercentage === 100 ? daysAgo(2) : null },
    ] });
    await db.taskActivity.create({ data: { organizationId: org.id, taskId: task.id, actorUserId: assigneeId, activityType: 'STATUS_CHANGED', description: `Task moved to ${status.toLowerCase().replaceAll('_', ' ')}`, createdAt: daysAgo(Math.max(1, 8 - i)) } });
  }

  await db.taskComment.createMany({ data: [
    { organizationId: org.id, taskId: tasks[0].id, authorId: lead.id, content: 'Strong first direction. Please make the CTA more prominent.', visibility: 'INTERNAL' },
    { organizationId: org.id, taskId: tasks[1].id, authorId: clientAdmin.id, content: 'The warmer palette feels right for the launch.', visibility: 'CLIENT_VISIBLE' },
    { organizationId: org.id, taskId: tasks[2].id, authorId: employee.id, content: 'Updated the opening frame based on feedback.', visibility: 'CLIENT_VISIBLE' },
  ] });

  const pending = await db.taskSubmission.create({ data: { organizationId: org.id, taskId: tasks[1].id, submittedBy: designer.id, submissionNumber: 1, description: 'Key visual concepts for client approval.', status: 'PENDING_REVIEW', clientVisible: true } });
  const revision = await db.taskSubmission.create({ data: { organizationId: org.id, taskId: tasks[2].id, submittedBy: designer.id, submissionNumber: 1, description: 'First cut of the 30-second product reel.', status: 'REVISION_REQUIRED', reviewComment: 'Please shorten the intro and show the product sooner.', reviewedBy: clientAdmin.id, reviewedAt: daysAgo(1), clientVisible: true } });
  const approved = await db.taskSubmission.create({ data: { organizationId: org.id, taskId: tasks[5].id, submittedBy: lead.id, submissionNumber: 1, description: 'Final monthly performance report.', status: 'APPROVED', reviewComment: 'Approved—excellent summary.', reviewedBy: clientAdmin.id, reviewedAt: daysAgo(2), clientVisible: true } });
  await db.taskDeliverable.createMany({ data: [
    { organizationId: org.id, taskId: tasks[1].id, submissionId: pending.id, uploadedBy: designer.id, fileName: 'acme-key-visual-v1.png', fileSize: 2480000, mimeType: 'image/png', storageKey: 'demo/acme-key-visual-v1.png' },
    { organizationId: org.id, taskId: tasks[2].id, submissionId: revision.id, uploadedBy: designer.id, fileName: 'product-reel-v1.mp4', fileSize: 18400000, mimeType: 'video/mp4', storageKey: 'demo/product-reel-v1.mp4' },
    { organizationId: org.id, taskId: tasks[5].id, submissionId: approved.id, uploadedBy: lead.id, fileName: 'monthly-performance.pdf', fileSize: 920000, mimeType: 'application/pdf', storageKey: 'demo/monthly-performance.pdf' },
  ] });
  await db.taskReview.create({ data: { organizationId: org.id, taskId: tasks[5].id, submissionId: approved.id, reviewerId: manager.id, action: 'APPROVE', comment: 'Ready to share with the client.' } });
  await db.clientReview.createMany({ data: [
    { organizationId: org.id, clientId: acme.id, taskId: tasks[2].id, submissionId: revision.id, reviewerId: clientAdmin.id, status: 'CHANGES_REQUESTED', comment: 'Please shorten the intro and show the product sooner.' },
    { organizationId: org.id, clientId: acme.id, taskId: tasks[5].id, submissionId: approved.id, reviewerId: clientAdmin.id, status: 'APPROVED', comment: 'Approved—excellent summary.' },
  ] });

  await db.notification.createMany({ data: [
    { organizationId: org.id, recipientId: clientAdmin.id, type: 'REVIEW_REQUESTED', title: 'New work ready for review', message: 'The campaign key visual is ready for your feedback.', entityType: 'task', entityId: tasks[1].id },
    { organizationId: org.id, recipientId: designer.id, type: 'CHANGES_REQUESTED', title: 'Client requested changes', message: 'The product reel needs a shorter introduction.', entityType: 'task', entityId: tasks[2].id },
    { organizationId: org.id, recipientId: manager.id, type: 'TASK_COMPLETED', title: 'Task completed', message: 'The landing page optimization is complete.', entityType: 'task', entityId: tasks[4].id, readAt: daysAgo(1) },
  ] });
  await db.report.createMany({ data: [
    { organizationId: org.id, createdBy: ceo.id, name: 'October executive overview', type: 'MONTHLY_ORGANIZATION', filters: { days: 30 } },
    { organizationId: org.id, createdBy: manager.id, name: 'Acme campaign health', type: 'CLIENT', filters: { clientId: acme.id, days: 90 } },
  ] });
  await db.invitation.createMany({ data: [
    { organizationId: org.id, email: 'new.writer@demo.dm', role: 'EMPLOYEE', tokenHash: 'demo-pending-writer-token', status: 'PENDING', expiresAt: daysFromNow(7), teamId: creative.id, invitedById: manager.id },
    { organizationId: org.id, email: 'freelancer@demo.dm', role: 'EMPLOYEE', tokenHash: 'demo-expired-freelancer-token', status: 'EXPIRED', expiresAt: daysAgo(4), invitedById: manager.id },
  ] });
  await db.activityLog.createMany({ data: [
    { organizationId: org.id, actorUserId: ceo.id, action: 'DEMO_WORKSPACE_CREATED', entityType: 'organization', entityId: org.id, metadata: { source: 'seed' }, createdAt: daysAgo(14) },
    { organizationId: org.id, actorUserId: manager.id, action: 'CLIENT_CREATED', entityType: 'client', entityId: acme.id, createdAt: daysAgo(12) },
    { organizationId: org.id, actorUserId: lead.id, action: 'TASK_ASSIGNED', entityType: 'task', entityId: tasks[0].id, createdAt: daysAgo(3) },
  ] });

  await addFullDemoData(org.id, passwordHash);
  await seedComOnboarding(org.id,ceo.id);

  console.log(`Demo workspace created. Sign in with any account below using password: ${password}`);
  for (const { user, role } of users) console.log(`${String(role).padEnd(10)} ${user.email}`);
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
