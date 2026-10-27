import {
  PrismaClient,
  OrganizationStatus,
  UserStatus,
  QuestionType,
  DifficultyLevel,
  QuestionStatus,
  PaperStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function runDatabaseTests() {
  console.log('====================================================');
  console.log('   PRISMA ORM & POSTGRESQL DATABASE VERIFICATION    ');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: unknown, message: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  }

  try {
    // --------------------------------------------------------------------------
    // Test 1: Connectivity & Seed Data Verification
    // --------------------------------------------------------------------------
    console.log('\n--- 1. Configuration & Seed Data Verification ---');
    const rolesCount = await prisma.role.count();
    assert(rolesCount >= 12, `Roles seeded correctly (Found: ${rolesCount})`);

    const permissionsCount = await prisma.permission.count();
    assert(permissionsCount >= 27, `Permissions seeded correctly (Found: ${permissionsCount})`);

    const university = await prisma.university.findUnique({
      where: { code: 'APEX-UNIV' },
      include: { institutions: { include: { departments: true } } },
    });
    assert(!!university, 'Anchor university APEX-UNIV exists');
    assert(university?.institutions.length! > 0, 'Anchor institution exists under university');
    assert(
      university?.institutions[0].departments.length! > 0,
      'Anchor department exists under institution'
    );

    const univAdmin = await prisma.user.findFirst({
      where: { username: 'admin' },
      include: {
        roleAssignments: {
          include: { role: true, university: true, institution: true, department: true },
        },
      },
    });
    assert(!!univAdmin, 'Development University Admin (admin) exists');
    assert(
      !!univAdmin?.roleAssignments.some((r) => r.role.code === 'UNIVERSITY_ADMIN'),
      'University Admin has UNIVERSITY_ADMIN role assigned'
    );
    assert(
      !univAdmin?.roleAssignments.some((r) => r.role.code === 'SUPER_ADMIN'),
      'University Admin is NOT granted SUPER_ADMIN privileges'
    );
    assert(
      univAdmin?.passwordChangedAt === null,
      'University Admin requires password change on first login'
    );

    // --------------------------------------------------------------------------
    // Test 2: Academic Hierarchy & Scope
    // --------------------------------------------------------------------------
    console.log('\n--- 2. Academic Entities CRUD & Scope Checks ---');
    const department = university!.institutions[0].departments[0];

    const testProgram = await prisma.program.create({
      data: {
        departmentId: department.id,
        code: 'TEST-BTECH',
        name: 'Bachelor of Technology in Test Engineering',
        durationYears: 4,
        status: OrganizationStatus.active,
      },
    });
    assert(!!testProgram.id, 'Program created with relation to Department');

    const testSemester = await prisma.semester.create({
      data: {
        programId: testProgram.id,
        number: 1,
        label: 'Semester 1',
      },
    });
    assert(!!testSemester.id, 'Semester created with relation to Program');

    const testSubject = await prisma.subject.create({
      data: {
        departmentId: department.id,
        programId: testProgram.id,
        semesterId: testSemester.id,
        code: 'TEST-CS101',
        name: 'Introduction to Algorithms',
        credits: 4,
        language: 'English',
        status: OrganizationStatus.active,
      },
    });
    assert(!!testSubject.id, 'Subject created with relations to Dept, Program, Semester');

    const testUnit = await prisma.unit.create({
      data: {
        subjectId: testSubject.id,
        number: 1,
        name: 'Divide and Conquer',
        weightagePercent: 25.0,
      },
    });
    assert(!!testUnit.id, 'Unit created under Subject');

    const testTopic = await prisma.topic.create({
      data: {
        unitId: testUnit.id,
        subjectId: testSubject.id,
        name: 'Merge Sort and Quick Sort',
      },
    });
    assert(!!testTopic.id, 'Topic created under Unit');

    // --------------------------------------------------------------------------
    // Test 3: Question Authoring, Versioning & Bank Management
    // --------------------------------------------------------------------------
    console.log('\n--- 3. Question Bank & Question Lifecycle CRUD ---');
    const qBank = await prisma.questionBank.create({
      data: {
        subjectId: testSubject.id,
        name: 'Algorithms Core Bank 2026',
        description: 'Vetted questions for end-semester assessments',
      },
    });
    assert(!!qBank.id, 'Question Bank created under Subject');

    const testQuestion = await prisma.question.create({
      data: {
        universityId: university!.id,
        institutionId: university!.institutions[0].id,
        departmentId: department.id,
        subjectId: testSubject.id,
        unitId: testUnit.id,
        topicId: testTopic.id,
        questionBankId: qBank.id,
        type: QuestionType.MCQ,
        difficulty: DifficultyLevel.MEDIUM,
        marks: 2.0,
        text: 'What is the average case time complexity of Merge Sort?',
        answer: 'O(n log n)',
        options: [
          { key: 'A', text: 'O(n)' },
          { key: 'B', text: 'O(n log n)' },
          { key: 'C', text: 'O(n^2)' },
          { key: 'D', text: 'O(1)' },
        ],
        correctAnswer: 'B',
        createdById: univAdmin!.id,
        status: QuestionStatus.APPROVED,
        version: 1,
      },
    });
    assert(!!testQuestion.id, 'Question created with multi-level relations & JSON options');

    const testVersion = await prisma.questionVersion.create({
      data: {
        questionId: testQuestion.id,
        version: 1,
        text: testQuestion.text,
        marks: testQuestion.marks,
        difficulty: testQuestion.difficulty,
        status: testQuestion.status,
        options: testQuestion.options as any,
        correctAnswer: testQuestion.correctAnswer,
        editedById: univAdmin!.id,
        comments: 'Initial baseline vetted version',
      },
    });
    assert(!!testVersion.id, 'Question Version history record created');

    // --------------------------------------------------------------------------
    // Test 4: Question Paper Generation & Workflow
    // --------------------------------------------------------------------------
    console.log('\n--- 4. Question Paper Generation, Sections & Workflow ---');
    const testExam = await prisma.exam.create({
      data: {
        universityId: university!.id,
        institutionId: university!.institutions[0].id,
        departmentId: department.id,
        code: 'MID-2026',
        name: 'Mid-Semester Examination Autumn 2026',
        academicYear: '2026-2027',
        semester: 'Odd',
      },
    });
    assert(!!testExam.id, 'Examination schedule record created');

    const testPaper = await prisma.questionPaper.create({
      data: {
        universityId: university!.id,
        institutionId: university!.institutions[0].id,
        departmentId: department.id,
        subjectId: testSubject.id,
        programId: testProgram.id,
        semesterId: testSemester.id,
        examId: testExam.id,
        title: 'Mid-Sem Examination: Algorithms',
        academicYear: '2026-2027',
        setLetter: 'A',
        totalMarks: 50.0,
        durationMinutes: 90,
        status: PaperStatus.SUBMITTED,
        createdById: univAdmin!.id,
      },
    });
    assert(!!testPaper.id, 'Question Paper record created');

    const testSection = await prisma.paperSection.create({
      data: {
        paperId: testPaper.id,
        orderIndex: 1,
        title: 'Section A - Multiple Choice Questions',
        instructions: 'Answer all questions. Each carries 2 marks.',
        marksPerQuestion: 2.0,
      },
    });
    assert(!!testSection.id, 'Paper Section created');

    const paperQuestion = await prisma.paperQuestion.create({
      data: {
        sectionId: testSection.id,
        questionId: testQuestion.id,
        questionVersion: 1,
        orderIndex: 1,
        marks: 2.0,
        snapshotText: testQuestion.text,
        snapshotOptions: testQuestion.options as any,
      },
    });
    assert(!!paperQuestion.id, 'Question attached to Paper Section with immutable snapshot');

    const timelineEntry = await prisma.paperWorkflowTimeline.create({
      data: {
        paperId: testPaper.id,
        status: PaperStatus.SUBMITTED,
        actorId: univAdmin!.id,
        comment: 'Initial paper draft submitted for reviewer scrutinization.',
      },
    });
    assert(!!timelineEntry.id, 'Paper approval workflow timeline entry recorded');

    // --------------------------------------------------------------------------
    // Test 5: Audit Log Persistence
    // --------------------------------------------------------------------------
    console.log('\n--- 5. Audit Logging Verification ---');
    const authAudit = await prisma.authenticationAuditEvent.create({
      data: {
        eventType: 'login_success',
        userId: univAdmin!.id,
        ipAddress: '127.0.0.1',
        userAgent: 'Jest/Tsx Test Runner',
        details: 'Admin verified login via automated verification suite',
      },
    });
    assert(!!authAudit.id, 'Authentication audit event recorded');

    const sysAudit = await prisma.systemAuditLog.create({
      data: {
        action: 'QUESTION_PAPER_CREATED',
        actorId: univAdmin!.id,
        resource: 'QuestionPaper',
        resourceId: testPaper.id,
        severity: 'INFO',
        description: 'Automated test verified question paper lifecycle',
      },
    });
    assert(!!sysAudit.id, 'System audit log entry recorded');

    // --------------------------------------------------------------------------
    // Test 6: Clean Up Ephemeral Test Records
    // --------------------------------------------------------------------------
    console.log('\n--- 6. Clean Up Test Records ---');
    await prisma.paperWorkflowTimeline.delete({ where: { id: timelineEntry.id } });
    await prisma.paperQuestion.delete({ where: { id: paperQuestion.id } });
    await prisma.paperSection.delete({ where: { id: testSection.id } });
    await prisma.questionPaper.delete({ where: { id: testPaper.id } });
    await prisma.exam.delete({ where: { id: testExam.id } });
    await prisma.questionVersion.delete({ where: { id: testVersion.id } });
    await prisma.question.delete({ where: { id: testQuestion.id } });
    await prisma.questionBank.delete({ where: { id: qBank.id } });
    await prisma.topic.delete({ where: { id: testTopic.id } });
    await prisma.unit.delete({ where: { id: testUnit.id } });
    await prisma.subject.delete({ where: { id: testSubject.id } });
    await prisma.semester.delete({ where: { id: testSemester.id } });
    await prisma.program.delete({ where: { id: testProgram.id } });
    await prisma.authenticationAuditEvent.delete({ where: { id: authAudit.id } });
    await prisma.systemAuditLog.delete({ where: { id: sysAudit.id } });

    assert(true, 'Ephemeral test fixtures cleaned up safely without deleting anchor records');

    console.log('\n====================================================');
    console.log(`🎉 ALL TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ Test execution failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDatabaseTests();
