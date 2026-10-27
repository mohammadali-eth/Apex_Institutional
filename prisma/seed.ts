import { PrismaClient, OrganizationStatus, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// System Roles Catalog
const ROLE_CATALOG = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Platform-level administrative management across all universities and system operations.',
    isSystem: true,
  },
  {
    code: 'UNIVERSITY_ADMIN',
    name: 'University Administrator',
    description: 'University-level administrative management, staff provisioning, and organizational governance.',
    isSystem: false,
  },
  {
    code: 'INSTITUTION_ADMIN',
    name: 'Institution Administrator',
    description: 'Campus/college administrative lead managing local institutional operations.',
    isSystem: false,
  },
  {
    code: 'DEPARTMENT_ADMIN',
    name: 'Department Administrator / HOD',
    description: 'Academic department head managing course allocations and academic operations.',
    isSystem: false,
  },
  {
    code: 'FACULTY_QUESTION_SETTER',
    name: 'Faculty / Question Setter',
    description: 'Authorized faculty member responsible for authoring and submitting assessment questions.',
    isSystem: false,
  },
  {
    code: 'QUESTION_PAPER_REVIEWER',
    name: 'Question Paper Reviewer',
    description: 'Subject matter expert responsible for scrutinizing and reviewing question papers.',
    isSystem: false,
  },
  {
    code: 'EXAM_CONTROLLER',
    name: 'Exam Controller',
    description: 'Institutional authority governing examination processes and security compliance.',
    isSystem: false,
  },
  {
    code: 'EXAM_COORDINATOR',
    name: 'Exam Coordinator',
    description: 'Operational coordinator handling examination logistics and schedules.',
    isSystem: false,
  },
  {
    code: 'QUESTION_BANK_MANAGER',
    name: 'Question Bank Manager',
    description: 'Custodian of the institutional question repository and taxonomy structures.',
    isSystem: false,
  },
  {
    code: 'QUALITY_CONTROLLER',
    name: 'Quality Controller',
    description: 'Academic quality assurance officer reviewing pedagogical and syllabus standards.',
    isSystem: false,
  },
  {
    code: 'STUDENT',
    name: 'Student',
    description: 'Enrolled student identity with examination access boundaries.',
    isSystem: false,
  },
  {
    code: 'GENERAL_USER',
    name: 'General User',
    description: 'Authenticated user with base portal access rights.',
    isSystem: false,
  },
];

// System Permissions
const PERMISSION_CATALOG = [
  { code: 'user.view', name: 'View Users', module: 'USER' },
  { code: 'user.create', name: 'Create Users', module: 'USER' },
  { code: 'user.update', name: 'Update Users', module: 'USER' },
  { code: 'user.delete', name: 'Delete Users', module: 'USER' },
  { code: 'question.view', name: 'View Questions', module: 'QUESTION' },
  { code: 'question.create', name: 'Create Questions', module: 'QUESTION' },
  { code: 'question.update', name: 'Update Questions', module: 'QUESTION' },
  { code: 'question.delete', name: 'Delete Questions', module: 'QUESTION' },
  { code: 'question.approve', name: 'Approve Questions', module: 'QUESTION' },
  { code: 'question_bank.view', name: 'View Question Bank', module: 'QUESTION_BANK' },
  { code: 'question_bank.manage', name: 'Manage Question Bank', module: 'QUESTION_BANK' },
  { code: 'question_bank.archive', name: 'Archive Question Bank', module: 'QUESTION_BANK' },
  { code: 'paper.view', name: 'View Papers', module: 'PAPER' },
  { code: 'paper.create', name: 'Create Papers', module: 'PAPER' },
  { code: 'paper.update', name: 'Update Papers', module: 'PAPER' },
  { code: 'paper.submit', name: 'Submit Papers', module: 'PAPER' },
  { code: 'paper.review', name: 'Review Papers', module: 'PAPER' },
  { code: 'paper.approve', name: 'Approve Papers', module: 'PAPER' },
  { code: 'paper.finalize', name: 'Finalize Papers', module: 'PAPER' },
  { code: 'paper.publish', name: 'Publish Papers', module: 'PAPER' },
  { code: 'exam.view', name: 'View Exams', module: 'EXAM' },
  { code: 'exam.create', name: 'Create Exams', module: 'EXAM' },
  { code: 'exam.update', name: 'Update Exams', module: 'EXAM' },
  { code: 'exam.manage', name: 'Manage Exams', module: 'EXAM' },
  { code: 'report.view', name: 'View Reports', module: 'REPORT' },
  { code: 'audit.view', name: 'View Audit Logs', module: 'AUDIT' },
  { code: 'system.manage', name: 'Manage System Settings', module: 'SYSTEM' },
];

async function main() {
  console.log('--- Starting Database Seeding ---');

  // 1. Seed Roles
  console.log('Seeding role catalog...');
  const roleMap: Record<string, string> = {};
  for (const r of ROLE_CATALOG) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
      },
      create: {
        code: r.code,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        isActive: true,
      },
    });
    roleMap[r.code] = role.id;
  }
  console.log(`✓ Synchronized ${ROLE_CATALOG.length} roles.`);

  // 2. Seed Permissions
  console.log('Seeding permission catalog...');
  const permissionMap: Record<string, string> = {};
  for (const p of PERMISSION_CATALOG) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        module: p.module,
      },
      create: {
        code: p.code,
        name: p.name,
        module: p.module,
      },
    });
    permissionMap[p.code] = perm.id;
  }
  console.log(`✓ Synchronized ${PERMISSION_CATALOG.length} permissions.`);

  // 3. Seed Role-Permission Associations
  console.log('Associating default permissions with roles...');
  const rolePermissionsMapping: Record<string, string[]> = {
    SUPER_ADMIN: PERMISSION_CATALOG.map((p) => p.code),
    UNIVERSITY_ADMIN: [
      'user.view', 'user.create', 'user.update', 'user.delete',
      'question.view', 'question_bank.view',
      'paper.view', 'paper.create', 'paper.approve', 'paper.finalize', 'paper.publish',
      'exam.view', 'exam.create', 'exam.update', 'exam.manage',
      'report.view', 'audit.view', 'system.manage'
    ],
    INSTITUTION_ADMIN: [
      'user.view', 'user.create', 'user.update',
      'question.view', 'question_bank.view',
      'paper.view', 'exam.view', 'exam.create', 'exam.update', 'report.view'
    ],
    DEPARTMENT_ADMIN: [
      'user.view', 'user.create',
      'question.view', 'question.create', 'question.update', 'question.approve',
      'question_bank.view', 'question_bank.manage',
      'paper.view', 'paper.create', 'paper.update', 'paper.submit', 'paper.review', 'paper.approve', 'paper.finalize',
      'exam.view', 'exam.create', 'exam.update', 'report.view'
    ],
    FACULTY_QUESTION_SETTER: [
      'question.view', 'question.create', 'question.update',
      'question_bank.view', 'question_bank.manage',
      'paper.view', 'paper.create', 'paper.update', 'paper.submit',
      'exam.view', 'report.view'
    ],
    QUESTION_PAPER_REVIEWER: [
      'question.view', 'question_bank.view',
      'paper.view', 'paper.review', 'exam.view', 'report.view'
    ],
    EXAM_CONTROLLER: [
      'question.view', 'question_bank.view',
      'paper.view', 'paper.review', 'paper.approve', 'paper.finalize', 'paper.publish',
      'exam.view', 'exam.create', 'exam.update', 'exam.manage', 'report.view', 'audit.view'
    ],
    EXAM_COORDINATOR: [
      'question.view', 'question_bank.view',
      'paper.view', 'paper.create', 'paper.update', 'paper.submit', 'paper.review', 'paper.approve',
      'exam.view', 'exam.create', 'exam.update', 'exam.manage', 'report.view'
    ],
    QUESTION_BANK_MANAGER: [
      'question.view', 'question.create', 'question.update', 'question.delete', 'question.approve',
      'question_bank.view', 'question_bank.manage', 'question_bank.archive', 'report.view'
    ],
    QUALITY_CONTROLLER: [
      'question.view', 'question.approve', 'question_bank.view',
      'paper.view', 'paper.review', 'paper.approve', 'report.view'
    ],
    STUDENT: ['exam.view'],
    GENERAL_USER: ['exam.view'],
  };

  for (const [roleCode, permCodes] of Object.entries(rolePermissionsMapping)) {
    const roleId = roleMap[roleCode];
    if (!roleId) continue;
    for (const permCode of permCodes) {
      const permId = permissionMap[permCode];
      if (!permId) continue;
      await prisma.rolePermission.upsert({
        where: {
          uq_role_permission: {
            roleId,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId: permId,
        },
      });
    }
  }
  console.log('✓ Synchronized role-permission associations.');

  // 4. Seed Development Anchor University & Institution
  console.log('Ensuring development anchor University and Institution exist...');
  const university = await prisma.university.upsert({
    where: { code: 'APEX-UNIV' },
    update: {
      name: 'Apex State University',
      status: OrganizationStatus.active,
    },
    create: {
      code: 'APEX-UNIV',
      name: 'Apex State University',
      type: 'State University',
      status: OrganizationStatus.active,
      region: 'Central Region',
      address: '100 University Ave, Academic City',
    },
  });

  const institution = await prisma.institution.upsert({
    where: { code: 'INST-MAIN' },
    update: {
      name: 'Apex Institute of Technology & Engineering',
      status: OrganizationStatus.active,
    },
    create: {
      universityId: university.id,
      code: 'INST-MAIN',
      name: 'Apex Institute of Technology & Engineering',
      type: 'College',
      status: OrganizationStatus.active,
      contactEmail: 'contact@apex-tech.edu',
      address: 'Main Campus, Building A',
    },
  });

  const department = await prisma.department.upsert({
    where: {
      uq_department_inst_code: {
        institutionId: institution.id,
        code: 'CSE',
      },
    },
    update: {
      name: 'Computer Science and Engineering',
      status: OrganizationStatus.active,
    },
    create: {
      institutionId: institution.id,
      code: 'CSE',
      name: 'Computer Science and Engineering',
      hodName: 'Dr. Alan Turing',
      status: OrganizationStatus.active,
    },
  });
  console.log('✓ Anchor University, Institution, and Department verified.');

  // 5. Seed Controlled Development University Admin (admin / admin123)
  console.log('Configuring development University Admin account...');
  const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
  const adminEmail = 'admin@apex-tech.edu';

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ username: adminUsername }, { email: adminEmail }],
    },
  });

  if (!existingAdmin) {
    // Hash password with Argon2id matching backend security parameters
    const hashedPassword = await argon2.hash(adminPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Create user requiring password change on first login (passwordChangedAt: null)
    const newAdmin = await prisma.user.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        fullName: 'University Administrator',
        passwordHash: hashedPassword,
        status: UserStatus.active,
        emailVerifiedAt: new Date(),
        passwordChangedAt: null, // Forces password change on first login
      },
    });

    // Assign UNIVERSITY_ADMIN role (NOT SUPER_ADMIN)
    await prisma.userRoleAssignment.create({
      data: {
        userId: newAdmin.id,
        roleId: roleMap['UNIVERSITY_ADMIN'],
        universityId: university.id,
        institutionId: institution.id,
        departmentId: department.id,
        isActive: true,
      },
    });

    console.log(`✓ Created development University Admin (${adminUsername}) with UNIVERSITY_ADMIN role.`);
  } else {
    console.log(`✓ Development University Admin account already exists. Preserved existing credentials.`);
  }

  // 6. Seed Domain-Based Access Mappings
  console.log('Configuring domain-to-role mappings...');
  const domainMappings = [
    {
      domainPattern: '*@superadmin.com',
      roleId: roleMap['SUPER_ADMIN'],
      identityType: 'SUPER_ADMIN',
      priority: 10,
      description: 'Super Administrator wildcard pattern',
    },
    {
      domainPattern: '*@universityadmin.com',
      roleId: roleMap['UNIVERSITY_ADMIN'],
      universityId: university.id,
      identityType: 'UNIVERSITY_ADMIN',
      priority: 20,
      description: 'University Admin wildcard pattern',
    },
    {
      domainPattern: 'universityadmin.in',
      roleId: roleMap['UNIVERSITY_ADMIN'],
      universityId: university.id,
      identityType: 'UNIVERSITY_ADMIN',
      priority: 20,
      description: 'University Admin domain mapping',
    },
    {
      domainPattern: 'cs.hod@hod.com',
      roleId: roleMap['DEPARTMENT_ADMIN'],
      universityId: university.id,
      institutionId: institution.id,
      departmentId: department.id,
      identityType: 'HOD',
      priority: 5,
      description: 'CS HOD exact email and department scope mapping',
    },
    {
      domainPattern: '*@hod.com',
      roleId: roleMap['DEPARTMENT_ADMIN'],
      universityId: university.id,
      institutionId: institution.id,
      identityType: 'HOD',
      priority: 30,
      description: 'Department Admin / HOD wildcard pattern',
    },
    {
      domainPattern: '*@faculty.com',
      roleId: roleMap['FACULTY_QUESTION_SETTER'],
      universityId: university.id,
      institutionId: institution.id,
      departmentId: department.id,
      identityType: 'FACULTY_QUESTION_SETTER',
      priority: 40,
      description: 'Faculty Question Setter wildcard pattern',
    },
    {
      domainPattern: '*@examcontroller.com',
      roleId: roleMap['EXAM_CONTROLLER'],
      universityId: university.id,
      institutionId: institution.id,
      identityType: 'EXAM_CONTROLLER',
      priority: 40,
      description: 'Exam Controller wildcard pattern',
    },
  ];

  for (const dm of domainMappings) {
    const existing = await prisma.domainRoleMapping.findFirst({
      where: { domainPattern: dm.domainPattern },
    });
    if (!existing) {
      await prisma.domainRoleMapping.create({
        data: dm,
      });
      console.log(`✓ Seeded domain mapping: ${dm.domainPattern}`);
    }
  }

  // 7. Seed Master Accounts for Domain Authentication
  console.log('Configuring master domain test accounts...');
  const masterPassword = 'ApexDev#2026!';
  const hashedMasterPassword = await argon2.hash(masterPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const masterUsers = [
    {
      email: 'apex@superadmin.com',
      username: 'superadmin',
      fullName: 'Apex Super Admin',
      roleCode: 'SUPER_ADMIN',
      univId: null,
      instId: null,
      deptId: null,
    },
    {
      email: 'admin@universityadmin.com',
      username: 'univadmin',
      fullName: 'University Administrator',
      roleCode: 'UNIVERSITY_ADMIN',
      univId: university.id,
      instId: null,
      deptId: null,
    },
    {
      email: 'cs.hod@hod.com',
      username: 'cshod',
      fullName: 'Computer Science HOD',
      roleCode: 'DEPARTMENT_ADMIN',
      univId: university.id,
      instId: institution.id,
      deptId: department.id,
    },
    {
      email: 'faculty@faculty.com',
      username: 'faculty1',
      fullName: 'Assessment Faculty Member',
      roleCode: 'FACULTY_QUESTION_SETTER',
      univId: university.id,
      instId: institution.id,
      deptId: department.id,
    },
    {
      email: 'student@gmail.com',
      username: 'student_gmail',
      fullName: 'Student User (Gmail)',
      roleCode: 'STUDENT',
      univId: university.id,
      instId: null,
      deptId: null,
    },
    {
      email: 'student@yahoo.com',
      username: 'student_yahoo',
      fullName: 'Student User (Yahoo)',
      roleCode: 'STUDENT',
      univId: university.id,
      instId: null,
      deptId: null,
    },
  ];

  for (const u of masterUsers) {
    const existing = await prisma.user.findFirst({
      where: { email: u.email },
    });
    if (!existing) {
      const created = await prisma.user.create({
        data: {
          username: u.username,
          email: u.email,
          fullName: u.fullName,
          passwordHash: hashedMasterPassword,
          status: UserStatus.active,
          emailVerifiedAt: new Date(),
          passwordChangedAt: new Date(),
        },
      });

      await prisma.userRoleAssignment.create({
        data: {
          userId: created.id,
          roleId: roleMap[u.roleCode],
          universityId: u.univId,
          institutionId: u.instId,
          departmentId: u.deptId,
          isActive: true,
        },
      });
      console.log(`✓ Seeded master user: ${u.email} (${u.roleCode})`);
    }
  }

  console.log('--- Seed completed successfully! ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
