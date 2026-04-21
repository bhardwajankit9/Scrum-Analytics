// ─── Types ───────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  scrum_time: string;
  scrum_timezone: string;
  status: 'active' | 'archived';
  late_grace_minutes: number;
}

export interface Attendee {
  id: string;
  name: string;
  email: string;
  employee_id: string;
  role: 'dev' | 'qa' | 'ba';
  project: string;
  manager: string;
  status: 'active' | 'on_leave' | 'inactive';
}

export interface AttendanceRecord {
  id: string;
  attendee: Attendee;
  project_name: string;
  join_time: string | null;
  work_mode: 'office' | 'wfh' | null;
  status: 'present' | 'late' | 'absent';
  minutes_late: number;
  marked_by: string;
}

export interface DailyReportRow {
  date: string;
  day: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  attendance_rate: string;
}

export interface ActionAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  time_ago: string;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export const mockProjects: Project[] = [
  { id: 'p1', name: 'Project Alpha', description: 'Frontend Team', scrum_time: '10:15', scrum_timezone: 'Asia/Kolkata', status: 'active', late_grace_minutes: 5 },
  { id: 'p2', name: 'Project Beta',  description: 'Backend Team',  scrum_time: '10:15', scrum_timezone: 'Asia/Kolkata', status: 'active', late_grace_minutes: 5 },
  { id: 'p3', name: 'Project Gamma', description: 'QA Team',       scrum_time: '10:15', scrum_timezone: 'Asia/Kolkata', status: 'active', late_grace_minutes: 0 },
  { id: 'p4', name: 'Project Delta', description: 'DevOps Team',   scrum_time: '10:30', scrum_timezone: 'Asia/Kolkata', status: 'archived', late_grace_minutes: 0 },
];

// ─── Attendees ───────────────────────────────────────────────────────────────

export const mockAttendees: Attendee[] = [
  { id: 'a1',  name: 'Sarah Johnson',   email: 'sarah.j@company.com',   employee_id: 'EMP-2847', role: 'dev', project: 'Project Alpha', manager: 'Michael Chen',  status: 'active'   },
  { id: 'a2',  name: 'Michael Chen',    email: 'michael.c@company.com', employee_id: 'EMP-2651', role: 'dev', project: 'Project Beta',  manager: '—',             status: 'active'   },
  { id: 'a3',  name: 'Emily Rodriguez', email: 'emily.r@company.com',   employee_id: 'EMP-3092', role: 'qa',  project: 'Project Alpha', manager: 'Robert Taylor', status: 'active'   },
  { id: 'a4',  name: 'David Kumar',     email: 'david.k@company.com',   employee_id: 'EMP-2413', role: 'dev', project: 'Project Gamma', manager: 'Sarah Johnson', status: 'active'   },
  { id: 'a5',  name: 'Jessica Williams',email: 'jessica.w@company.com', employee_id: 'EMP-2789', role: 'ba',  project: 'Project Beta',  manager: '—',             status: 'on_leave' },
  { id: 'a6',  name: 'Robert Taylor',   email: 'robert.t@company.com',  employee_id: 'EMP-3156', role: 'dev', project: 'Project Alpha', manager: '—',             status: 'active'   },
  { id: 'a7',  name: 'Amanda Lee',      email: 'amanda.l@company.com',  employee_id: 'EMP-2934', role: 'qa',  project: 'Project Gamma', manager: 'Lisa Anderson', status: 'active'   },
  { id: 'a8',  name: 'James Wilson',    email: 'james.w@company.com',   employee_id: 'EMP-2201', role: 'ba',  project: 'Project Beta',  manager: 'Karen Davis',   status: 'active'   },
  { id: 'a9',  name: 'Karen Davis',     email: 'karen.d@company.com',   employee_id: 'EMP-1934', role: 'ba',  project: 'Project Alpha', manager: '—',             status: 'active'   },
  { id: 'a10', name: 'Lisa Anderson',   email: 'lisa.a@company.com',    employee_id: 'EMP-2105', role: 'qa',  project: 'Project Gamma', manager: '—',             status: 'active'   },
];

// ─── Today's Attendance ───────────────────────────────────────────────────────

export const mockTodayAttendance: AttendanceRecord[] = [
  { id: 't1', attendee: mockAttendees[0], project_name: 'Project Alpha', join_time: '10:12 AM', work_mode: 'office', status: 'present', minutes_late: 0, marked_by: 'Admin User' },
  { id: 't2', attendee: mockAttendees[1], project_name: 'Project Beta',  join_time: '10:19 AM', work_mode: 'wfh',    status: 'late',    minutes_late: 4, marked_by: 'Admin User' },
  { id: 't3', attendee: mockAttendees[2], project_name: 'Project Alpha', join_time: '10:10 AM', work_mode: 'wfh',    status: 'present', minutes_late: 0, marked_by: 'Admin User' },
  { id: 't4', attendee: mockAttendees[3], project_name: 'Project Gamma', join_time: '10:14 AM', work_mode: 'office', status: 'present', minutes_late: 0, marked_by: 'Admin User' },
  { id: 't5', attendee: mockAttendees[4], project_name: 'Project Beta',  join_time: null,        work_mode: null,     status: 'absent',  minutes_late: 0, marked_by: 'Admin User' },
];

// ─── Dashboard metrics ───────────────────────────────────────────────────────

export const mockDashboardMetrics = {
  presentToday:  { count: 24, total: 28, trend: '12%', up: true  },
  absent:        { count: 4,             trend: '3%',  up: false },
  lateArrivals:  { count: 3,             trend: '5%',  up: true  },
  onLeave:       { count: 1,             trend: '0%',  up: false },
};

// ─── Action alerts ───────────────────────────────────────────────────────────

export const mockAlerts: ActionAlert[] = [
  { id: 'al1', type: 'error',   title: 'Missing Punch-ins',       description: '2 attendees have incomplete records for today. Needs review before EOD.',           time_ago: '10m ago' },
  { id: 'al2', type: 'warning', title: 'High Tardiness Rate',     description: 'Project Beta showing 15% late arrivals today, above 5% threshold.',                 time_ago: '1h ago'  },
  { id: 'al3', type: 'info',    title: 'Weekly Report Ready',     description: 'Attendance summary for Week 16 is generated and ready for download.',                time_ago: '3h ago'  },
];

// ─── Attendance by project (chart) ───────────────────────────────────────────

export const mockProjectAttendance = [
  { project: 'Alpha', rate: 96 },
  { project: 'Beta',  rate: 81 },
  { project: 'Gamma', rate: 88 },
  { project: 'Delta', rate: 92 },
];

// ─── Detailed reports ─────────────────────────────────────────────────────────

export const mockDailyReports: DailyReportRow[] = [
  { date: 'Apr 18, 2026', day: 'Friday',    total: 28, present: 24, late: 3, absent: 1, attendance_rate: '95%'   },
  { date: 'Apr 17, 2026', day: 'Thursday',  total: 28, present: 25, late: 2, absent: 1, attendance_rate: '96.5%' },
  { date: 'Apr 16, 2026', day: 'Wednesday', total: 28, present: 23, late: 3, absent: 2, attendance_rate: '93%'   },
  { date: 'Apr 15, 2026', day: 'Tuesday',   total: 28, present: 26, late: 1, absent: 1, attendance_rate: '96.5%' },
  { date: 'Apr 14, 2026', day: 'Monday',    total: 28, present: 22, late: 4, absent: 2, attendance_rate: '92.8%' },
  { date: 'Apr 11, 2026', day: 'Friday',    total: 28, present: 27, late: 1, absent: 0, attendance_rate: '100%'  },
  { date: 'Apr 10, 2026', day: 'Thursday',  total: 28, present: 25, late: 2, absent: 1, attendance_rate: '96.5%' },
  { date: 'Apr 9, 2026',  day: 'Wednesday', total: 28, present: 24, late: 3, absent: 1, attendance_rate: '96.4%' },
];

// ─── Chart data for reports ───────────────────────────────────────────────────

export const mockReportChartData = [
  { date: 'Apr 9',  present: 24, late: 3, absent: 1 },
  { date: 'Apr 10', present: 25, late: 2, absent: 1 },
  { date: 'Apr 11', present: 27, late: 1, absent: 0 },
  { date: 'Apr 14', present: 22, late: 4, absent: 2 },
  { date: 'Apr 15', present: 26, late: 1, absent: 1 },
  { date: 'Apr 16', present: 23, late: 3, absent: 2 },
  { date: 'Apr 17', present: 25, late: 2, absent: 1 },
  { date: 'Apr 18', present: 24, late: 3, absent: 1 },
];
