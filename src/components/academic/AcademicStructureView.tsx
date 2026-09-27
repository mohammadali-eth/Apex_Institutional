import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { academicService } from '../../services/academicService';
import { userService } from '../../services/userService';
import { Institution, Department, Program, Subject, User, UserRole } from '../../types';
import {
  Building2,
  Layers,
  BookOpen,
  Search,
  Plus,
  CheckCircle2,
  ChevronRight,
  UserPlus,
  Key,
  Copy,
  Check,
  X,
  Users,
  Shield,
  Eye,
  EyeOff,
  GraduationCap,
  Sparkles,
  Award,
  Filter
} from 'lucide-react';

interface AcademicStructureViewProps {
  onNavigateQuestionBank: () => void;
  onNavigateGenerator: () => void;
  initialTab?: 'departments' | 'logins' | 'subjects' | 'programs' | 'institutions';
}

export const AcademicStructureView: React.FC<AcademicStructureViewProps> = ({
  onNavigateQuestionBank,
  onNavigateGenerator,
  initialTab = 'departments',
}) => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'departments' | 'logins' | 'subjects' | 'programs' | 'institutions'>('departments');
  useEffect(() => setActiveTab(initialTab), [initialTab]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const [institutions, setInstitutions] = useState<Institution[]>(() => academicService.getInstitutions());
  const [departments, setDepartments] = useState<Department[]>(() => academicService.getDepartments());
  const [programs, setPrograms] = useState<Program[]>(() => academicService.getPrograms());
  const [subjects, setSubjects] = useState<Subject[]>(() => academicService.getSubjects());
  const [users, setUsers] = useState<User[]>(() => userService.getUsers());

  // Modal States
  const [showCreateDeptModal, setShowCreateDeptModal] = useState(false);
  const [showCreateLoginModal, setShowCreateLoginModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Department Creation Form State
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptInstitutionId, setDeptInstitutionId] = useState(institutions[0]?.id || 'inst-apex');
  const [deptHodName, setDeptHodName] = useState('');
  const [deptStatus, setDeptStatus] = useState<'active' | 'inactive'>('active');

  // Unified Department Login ID Provisioning inside Department Modal
  const [includeLoginWithDept, setIncludeLoginWithDept] = useState(true);
  const [deptFacultyEmail, setDeptFacultyEmail] = useState('');
  const [deptFacultyPassword, setDeptFacultyPassword] = useState('Apex#2026');
  const [showDeptFacultyPassword, setShowDeptFacultyPassword] = useState(false);
  const [deptFacultyRole, setDeptFacultyRole] = useState<UserRole>('department_admin');

  // Standalone Login ID Form State (for adding additional logins to existing depts)
  const [loginFullName, setLoginFullName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('Apex#2026');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginRole, setLoginRole] = useState<UserRole>('faculty');
  const [loginSelectedDepts, setLoginSelectedDepts] = useState<string[]>([departments[0]?.id || 'dept-cs']);
  const [loginInstitutionId, setLoginInstitutionId] = useState(institutions[0]?.id || 'inst-apex');

  // Credential Created Banner / Notification
  const [createdCredentialNotification, setCreatedCredentialNotification] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
    departments: string[];
  } | null>(null);

  useEffect(() => {
    const handleAcademicUpdate = () => {
      setInstitutions(academicService.getInstitutions());
      setDepartments(academicService.getDepartments());
      setPrograms(academicService.getPrograms());
      setSubjects(academicService.getSubjects());
    };
    const handleUsersUpdate = () => {
      setUsers(userService.getUsers());
    };

    window.addEventListener('qpms_academic_updated', handleAcademicUpdate);
    window.addEventListener('qpms_users_updated', handleUsersUpdate);
    return () => {
      window.removeEventListener('qpms_academic_updated', handleAcademicUpdate);
      window.removeEventListener('qpms_users_updated', handleUsersUpdate);
    };
  }, []);

  const generateRandomPassword = (forDept: boolean = false) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let result = 'Apex#';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    result += '26';
    if (forDept) setDeptFacultyPassword(result);
    else setLoginPassword(result);
  };

  // Single Unified Creation Flow: Creates Department + Optional Department Login ID together
  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) return;

    const effectiveHodName = deptHodName.trim() || 'Pending Assignment';

    const newDept = academicService.addDepartment({
      name: deptName.trim(),
      code: deptCode.trim().toUpperCase(),
      institutionId: deptInstitutionId,
      hodName: effectiveHodName,
      status: deptStatus,
    });

    // If admin opted to provision the department login ID simultaneously
    if (includeLoginWithDept && deptFacultyEmail.trim()) {
      const userFullName = deptHodName.trim() || `${deptCode.toUpperCase()} Department Admin`;
      const createdUser = userService.createUser({
        name: userFullName,
        email: deptFacultyEmail.trim().toLowerCase(),
        role: deptFacultyRole,
        password: deptFacultyPassword,
        institutionId: deptInstitutionId,
        departmentIds: [newDept.id],
      });
      if (!createdUser) return;

      setCreatedCredentialNotification({
        name: createdUser.name,
        email: createdUser.email,
        password: deptFacultyPassword,
        role: createdUser.role,
        departments: [newDept.name],
      });
    }

    // Reset Form
    setDeptName('');
    setDeptCode('');
    setDeptHodName('');
    setDeptFacultyEmail('');
    setDeptFacultyPassword('Apex#2026');
    setShowCreateDeptModal(false);
    setActiveTab('departments');
  };

  // Standalone Login Creation (for existing departments)
  const handleCreateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginFullName.trim() || !loginEmail.trim() || loginSelectedDepts.length === 0) return;

    const created = userService.createUser({
      name: loginFullName,
      email: loginEmail,
      role: loginRole,
      password: loginPassword,
      institutionId: loginInstitutionId,
      departmentIds: loginSelectedDepts,
    });
    if (!created) return;

    const deptNames = departments
      .filter(d => loginSelectedDepts.includes(d.id))
      .map(d => d.name);

    setCreatedCredentialNotification({
      name: created.name,
      email: created.email,
      password: loginPassword,
      role: created.role,
      departments: deptNames,
    });

    setLoginFullName('');
    setLoginEmail('');
    setLoginPassword('Apex#2026');
    setShowCreateLoginModal(false);
    setActiveTab('logins');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const isUniversityAdmin = currentUser?.role === 'university_admin' || currentUser?.role === 'institution_admin' || currentUser?.role === 'department_admin';

  const roleConfigs = [
    {
      id: 'faculty' as UserRole,
      title: 'Teacher',
      desc: 'Author, edit and submit exam questions',
      badge: 'Faculty'
    },
    {
      id: 'department_admin' as UserRole,
      title: 'Head of Department (HOD)',
      desc: 'Review submissions & approve examination papers',
      badge: 'HOD'
    },
    {
      id: 'exam_coordinator' as UserRole,
      title: 'Exam Coordinator',
      desc: 'Generate balanced multi-set papers & distribution',
      badge: 'Coordinator'
    },
    {
      id: 'institution_admin' as UserRole,
      title: 'Institution Admin',
      desc: 'Manage institution curriculum and departments',
      badge: 'Admin'
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & SINGLE CONTEXTUAL ACTION BUTTON */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-brand-secondary rounded-2xl text-brand-primary shadow-sm flex-shrink-0">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold text-brand-title">Academic & Department Administration</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-primary-light text-brand-secondary border border-brand-primary/40">
                Official Directory
              </span>
            </div>
            <p className="text-xs text-brand-paragraph mt-1.5 max-w-2xl leading-relaxed">
              Create academic departments, provision department login accounts, and manage universal examination curricula.
            </p>
          </div>
        </div>

        {/* Single Primary Action Button in Header (Contextual based on active tab, no duplicates!) */}
        <div className="flex items-center gap-3 self-start md:self-center">
          {isUniversityAdmin && (
            activeTab === 'logins' ? (
              <button
                type="button"
                onClick={() => setShowCreateLoginModal(true)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition transform active:scale-95"
              >
                <Key className="h-4 w-4" />
                <span>Create Department Login ID</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreateDeptModal(true)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover shadow-md transition transform active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Create Department</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('departments')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === 'departments'
              ? 'bg-white border-brand-primary ring-1 ring-brand-primary shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-brand-paragraph mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Academic Departments</span>
            <Building2 className="h-4 w-4 text-brand-secondary" />
          </div>
          <div className="text-2xl font-bold text-brand-title">{departments.length}</div>
          <div className="text-[11px] text-brand-paragraph mt-1 flex items-center justify-between">
            <span>Configured faculties</span>
            {isUniversityAdmin && <span className="text-brand-primary font-bold hover:underline">+ Create</span>}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('logins')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === 'logins'
              ? 'bg-white border-brand-primary ring-1 ring-brand-primary shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-brand-paragraph mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Department Logins</span>
            <Key className="h-4 w-4 text-brand-secondary" />
          </div>
          <div className="text-2xl font-bold text-brand-title">{users.length}</div>
          <div className="text-[11px] text-brand-paragraph mt-1 flex items-center justify-between">
            <span>Authorized credentials</span>
            {isUniversityAdmin && <span className="text-brand-primary font-bold hover:underline">+ Issue ID</span>}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('subjects')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === 'subjects'
              ? 'bg-white border-brand-primary ring-1 ring-brand-primary shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-brand-paragraph mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Curriculum Subjects</span>
            <BookOpen className="h-4 w-4 text-brand-secondary" />
          </div>
          <div className="text-2xl font-bold text-brand-title">{subjects.length}</div>
          <div className="text-[11px] text-brand-paragraph mt-1">Across all departments</div>
        </div>

        <div
          onClick={() => setActiveTab('institutions')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === 'institutions'
              ? 'bg-white border-brand-primary ring-1 ring-brand-primary shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-brand-paragraph mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Parent Institutions</span>
            <Award className="h-4 w-4 text-brand-secondary" />
          </div>
          <div className="text-2xl font-bold text-brand-title">{institutions.length}</div>
          <div className="text-[11px] text-brand-paragraph mt-1">Colleges & Universities</div>
        </div>
      </div>

      {/* 3. FULL-WIDTH NAVIGATION TAB BAR */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center space-x-1.5 text-xs font-semibold">
          {[
            { id: 'departments', label: 'Departments', icon: Building2, count: departments.length },
            { id: 'logins', label: 'Department Logins', icon: Key, count: users.length },
            { id: 'subjects', label: 'Curriculum Subjects', icon: BookOpen, count: subjects.length },
            { id: 'programs', label: 'Degree Programs', icon: Layers, count: programs.length },
            { id: 'institutions', label: 'Institutions', icon: Award, count: institutions.length },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition text-xs whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-sm font-bold'
                    : 'text-brand-paragraph hover:text-brand-title hover:bg-slate-50 font-medium'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. POST-CREATION CREDENTIAL ALERT BANNER */}
      {createdCredentialNotification && (
        <div className="p-5 rounded-2xl bg-brand-primary-light border-2 border-brand-primary/40 text-brand-title shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase text-brand-title">
              <div className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center">
                <Check className="h-3 w-3" />
              </div>
              <span>Department & Login Credentials Created Successfully</span>
            </div>
            <p className="text-xs text-brand-paragraph">
              Access credentials ready for <strong className="text-slate-900">{createdCredentialNotification.name}</strong> ({createdCredentialNotification.role.toUpperCase()}).
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs bg-white p-3 rounded-xl border border-brand-primary/30 shadow-inner">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400 font-medium">Login Email ID:</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {createdCredentialNotification.email}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-3 flex items-center space-x-1.5">
                <span className="text-slate-400 font-medium">Password:</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {createdCredentialNotification.password}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-3 flex items-center space-x-1.5">
                <span className="text-slate-400 font-medium">Department:</span>
                <span className="font-semibold text-brand-secondary">
                  {createdCredentialNotification.departments.join(', ')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-center flex-shrink-0">
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  `Institutional Login ID: ${createdCredentialNotification.email}\nTemporary Password: ${createdCredentialNotification.password}\nRole: ${createdCredentialNotification.role}\nDepartment: ${createdCredentialNotification.departments.join(', ')}`,
                  'banner'
                )
              }
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-brand-primary text-white hover:bg-brand-primary-hover shadow-sm transition"
            >
              {copiedId === 'banner' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedId === 'banner' ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
            </button>
            <button
              type="button"
              onClick={() => setCreatedCredentialNotification(null)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white transition"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB VIEW 1: DEPARTMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          {/* Sub-toolbar (Search only, no duplicate create buttons!) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search departments by code, title, or HOD name..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <span className="text-xs text-brand-paragraph font-medium">
              Showing <strong>{departments.length}</strong> academic units
            </span>
          </div>

          {/* Department Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {departments
              .filter(
                d =>
                  d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  d.hodName.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(dept => {
                const deptFaculty = users.filter(
                  u => u.assignedDepartments.some(ad => ad.id === dept.id) || u.departmentId === dept.id
                );
                const deptSubjects = subjects.filter(s => s.departmentId === dept.id);

                return (
                  <div
                    key={dept.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-brand-primary/50 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-secondary text-white shadow-sm">
                          {dept.code}
                        </span>
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-primary-light text-brand-secondary border border-brand-primary/40">
                          <CheckCircle2 className="h-3 w-3 text-brand-primary" />
                          <span>{dept.status}</span>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-brand-title group-hover:text-brand-secondary transition">
                        {dept.name}
                      </h3>

                      <div className="mt-3 flex items-center space-x-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="w-6 h-6 rounded-full bg-brand-secondary/10 text-brand-secondary flex items-center justify-center font-bold text-[10px]">
                          HOD
                        </div>
                        <div className="truncate">
                          <span className="text-[10px] text-slate-400 block leading-tight">Head of Department</span>
                          <strong className="text-slate-800 text-xs truncate">{dept.hodName}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs text-brand-paragraph">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                          <span className="block text-[10px] text-slate-400 font-medium">Faculty Logins</span>
                          <span className="font-bold text-slate-800 text-sm">{deptFaculty.length}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                          <span className="block text-[10px] text-slate-400 font-medium">Subjects</span>
                          <span className="font-bold text-slate-800 text-sm">{deptSubjects.length}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setDepartmentFilter(dept.id);
                          setActiveTab('logins');
                        }}
                        className="w-full text-center py-2 text-xs font-bold text-brand-secondary hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition flex items-center justify-center space-x-1"
                      >
                        <span>View Department Logins</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB VIEW 2: DEPARTMENT LOGINS */}
      {/* ========================================================================= */}
      {activeTab === 'logins' && (
        <div className="space-y-4">
          {/* Sub-toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search faculty name, institutional login ID..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={departmentFilter}
                  onChange={e => setDepartmentFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="all">All Departments ({users.length})</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <span className="text-xs text-brand-paragraph font-medium">
              Showing <strong>{users.length}</strong> login accounts
            </span>
          </div>

          {/* Faculty Logins Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-brand-bg-title border-b border-slate-200 text-[10px] font-bold text-brand-font uppercase tracking-wider">
                  <th className="py-3.5 px-5">Faculty / Staff Member</th>
                  <th className="py-3.5 px-4">Institutional Login ID</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Assigned Department Scope</th>
                  <th className="py-3.5 px-4">Institution</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users
                  .filter(u => {
                    const matchesSearch =
                      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.assignedDepartments.some(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
                    const matchesDept =
                      departmentFilter === 'all' ||
                      u.assignedDepartments.some(d => d.id === departmentFilter) ||
                      u.departmentId === departmentFilter;
                    return matchesSearch && matchesDept;
                  })
                  .map(user => {
                    const deptCount = user.assignedDepartments.length;
                    const initials = user.name
                      .split(' ')
                      .map(p => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <tr key={user.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-brand-primary-light text-brand-secondary border border-brand-primary/30 flex items-center justify-center font-bold text-xs">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-brand-title">{user.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">UID: {user.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono text-slate-800 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {user.email}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              user.role === 'university_admin'
                                ? 'bg-brand-secondary text-white shadow-sm'
                                : user.role === 'department_admin'
                                ? 'bg-brand-primary-light text-brand-secondary border border-brand-primary/40 font-bold'
                                : user.role === 'exam_coordinator'
                                ? 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/30'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {deptCount === 0 ? (
                            <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[11px] font-semibold">
                              No Scope (Blocked)
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {user.assignedDepartments.map(d => (
                                <span
                                  key={d.id}
                                  className="px-2 py-0.5 rounded-md bg-brand-primary-light text-brand-title border border-brand-primary/30 text-[11px] font-semibold"
                                >
                                  {d.code}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          {user.institutionName}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(user.email, user.id)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 shadow-sm transition"
                            title="Copy Login Email ID"
                          >
                            {copiedId === user.id ? (
                              <Check className="h-3.5 w-3.5 text-brand-primary" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-slate-400" />
                            )}
                            <span>{copiedId === user.id ? 'Copied' : 'Copy ID'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB VIEW 3: CURRICULUM SUBJECTS */}
      {/* ========================================================================= */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search subject code, title or department..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <span className="text-xs text-brand-font font-medium">
              {subjects.length} Registered Curriculum Subjects
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-brand-bg-title border-b border-slate-200 text-[10px] font-bold text-brand-font uppercase tracking-wider">
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Program / Sem</th>
                  <th className="py-3 px-4">Units</th>
                  <th className="py-3 px-4">Questions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects
                  .filter(
                    s =>
                      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      s.code.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-brand-title">{sub.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{sub.code}</td>
                      <td className="py-3 px-4 text-slate-600">BCA • Sem 3</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-brand-title font-semibold">
                          {sub.unitCount} Units
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-brand-primary-light text-brand-secondary font-bold border border-brand-primary/30">
                          {sub.questionCount} Questions
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center space-x-1 text-brand-title font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={onNavigateQuestionBank}
                            className="px-2.5 py-1 text-[11px] font-semibold text-brand-title bg-slate-100 hover:bg-slate-200 rounded transition"
                          >
                            Bank
                          </button>
                          <button
                            type="button"
                            onClick={onNavigateGenerator}
                            className="px-2.5 py-1 text-[11px] font-semibold text-white bg-brand-primary hover:bg-brand-primary-hover rounded transition shadow-sm"
                          >
                            Generate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TAB VIEW 4: DEGREE PROGRAMS */}
      {/* ========================================================================= */}
      {activeTab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.map(prog => (
            <div key={prog.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="font-mono text-xs font-bold text-brand-font">{prog.code}</span>
              <h3 className="text-base font-bold text-brand-title">{prog.name}</h3>
              <p className="text-xs text-brand-paragraph">Duration: {prog.durationYears} Years</p>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. TAB VIEW 5: INSTITUTIONS */}
      {/* ========================================================================= */}
      {activeTab === 'institutions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {institutions.map(inst => (
            <div key={inst.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-brand-font">{inst.code}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-primary-light text-brand-secondary border border-brand-primary/30 uppercase">
                  {inst.status}
                </span>
              </div>
              <h3 className="text-base font-bold text-brand-title">{inst.name}</h3>
              <p className="text-xs text-brand-paragraph">Type: {inst.type}</p>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: UNIFIED "CREATE DEPARTMENT & LOGIN ID" MODAL */}
      {/* ========================================================================= */}
      {showCreateDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="h-1.5 w-full bg-brand-primary" />

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-brand-primary-light text-brand-secondary border border-brand-primary/30">
                    <Building2 className="h-6 w-6 text-brand-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-brand-title">Create Academic Department</h3>
                    <p className="text-xs text-brand-paragraph">Register new department and optionally generate its login credentials</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateDeptModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDepartment} className="space-y-4">
                {/* Department Info */}
                <div>
                  <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={deptName}
                    onChange={e => {
                      setDeptName(e.target.value);
                      if (!deptFacultyEmail) {
                        const clean = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (clean) setDeptFacultyEmail(`admin.${clean}@apexuniversity.edu`);
                      }
                    }}
                    placeholder="e.g. Department of Mechanical Engineering"
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary text-slate-900 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
                      Department Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={deptCode}
                      onChange={e => setDeptCode(e.target.value.toUpperCase())}
                      placeholder="e.g. ME"
                      className="w-full px-3.5 py-2.5 text-xs font-mono uppercase bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
                      Parent Institution
                    </label>
                    <select
                      value={deptInstitutionId}
                      onChange={e => setDeptInstitutionId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary font-medium"
                    >
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
                    Assigned Head of Department (HOD)
                  </label>
                  <input
                    type="text"
                    value={deptHodName}
                    onChange={e => setDeptHodName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Kumar (or leave blank to assign later)"
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary font-medium"
                  />
                </div>

                {/* Unified Department Login ID Toggle & Fields */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeLoginWithDept}
                      onChange={e => setIncludeLoginWithDept(e.target.checked)}
                      className="rounded border-slate-300 text-brand-primary accent-brand-primary focus:ring-brand-primary w-4 h-4"
                    />
                    <span className="text-xs font-bold text-brand-title">
                      Also provision department login ID now (Recommended)
                    </span>
                  </label>

                  {includeLoginWithDept && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-brand-font mb-1">
                            Login ID (Institutional Email) *
                          </label>
                          <input
                            type="email"
                            required={includeLoginWithDept}
                            value={deptFacultyEmail}
                            onChange={e => setDeptFacultyEmail(e.target.value)}
                            placeholder="e.g. hod.me@apexuniversity.edu"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary text-slate-900 font-mono font-medium"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold uppercase text-brand-font">
                              Password *
                            </label>
                            <button
                              type="button"
                              onClick={() => generateRandomPassword(true)}
                              className="text-[10px] font-bold text-brand-secondary hover:underline flex items-center space-x-0.5"
                            >
                              <Sparkles className="h-2.5 w-2.5 text-brand-primary" />
                              <span>Auto-Generate</span>
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type={showDeptFacultyPassword ? 'text' : 'password'}
                              required={includeLoginWithDept}
                              value={deptFacultyPassword}
                              onChange={e => setDeptFacultyPassword(e.target.value)}
                              className="w-full px-3 py-2 pr-8 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary font-mono font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => setShowDeptFacultyPassword(!showDeptFacultyPassword)}
                              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                            >
                              {showDeptFacultyPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-brand-font mb-1">
                          Assigned Role
                        </label>
                        <select
                          value={deptFacultyRole}
                          onChange={e => setDeptFacultyRole(e.target.value as any)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary font-medium capitalize"
                        >
                          <option value="hod">HOD (Department Admin & Paper Approver)</option>
                          <option value="teacher">Teacher (Question Author)</option>
                          <option value="coordinator">Exam Coordinator</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateDeptModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover rounded-xl shadow-md transition"
                  >
                    Create Department
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: STANDALONE "CREATE DEPARTMENT LOGIN ID" MODAL */}
      {/* ========================================================================= */}
      {showCreateLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="h-1.5 w-full bg-brand-secondary" />

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-brand-secondary text-brand-primary shadow-sm">
                    <Key className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-brand-title">Create Department Login ID</h3>
                    <p className="text-xs text-brand-paragraph">Issue additional faculty member credentials to existing departments</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateLoginModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateLogin} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
                      Faculty Member Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={loginFullName}
                      onChange={e => {
                        setLoginFullName(e.target.value);
                        if (!loginEmail) {
                          const clean = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '.');
                          if (clean) setLoginEmail(`${clean}@apexuniversity.edu`);
                        }
                      }}
                      placeholder="e.g. Dr. Sarah Jenkins"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
                      Institutional Login ID *
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="e.g. sarah.jenkins@apexuniversity.edu"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary text-slate-900 font-mono font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase text-brand-font">
                      Initial Access Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => generateRandomPassword(false)}
                      className="text-[11px] font-bold text-brand-secondary hover:text-slate-900 flex items-center space-x-1"
                    >
                      <Sparkles className="h-3 w-3 text-brand-primary" />
                      <span>Generate Strong Password</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-primary font-mono font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Role selection */}
                <div>
                  <label className="block text-xs font-bold uppercase text-brand-font mb-1.5">
                    System Role *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {roleConfigs.map(rc => {
                      const isSelected = loginRole === rc.id;
                      return (
                        <div
                          key={rc.id}
                          onClick={() => setLoginRole(rc.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition select-none ${
                            isSelected
                              ? 'border-brand-primary bg-brand-primary-light ring-1 ring-brand-primary shadow-sm'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900">{rc.title}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                isSelected ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {rc.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{rc.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Department Assignment */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase text-brand-font">
                      Assign Department Scope *
                    </label>
                    <span className="text-slate-400 text-[11px]">
                      {loginSelectedDepts.length} of {departments.length} selected
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-3 max-h-40 overflow-y-auto space-y-1.5 bg-slate-50/60">
                    {departments.map(dept => {
                      const isChecked = loginSelectedDepts.includes(dept.id);
                      return (
                        <label
                          key={dept.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                            isChecked
                              ? 'bg-white border-brand-primary/50 shadow-sm font-semibold text-brand-title'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setLoginSelectedDepts([...loginSelectedDepts, dept.id]);
                                } else {
                                  setLoginSelectedDepts(loginSelectedDepts.filter(id => id !== dept.id));
                                }
                              }}
                              className="rounded border-slate-300 text-brand-primary accent-brand-primary focus:ring-brand-primary w-4 h-4"
                            />
                            <span>{dept.name}</span>
                          </div>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-brand-secondary">
                            {dept.code}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateLoginModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loginSelectedDepts.length === 0}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hover rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    Issue Login Credentials
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
