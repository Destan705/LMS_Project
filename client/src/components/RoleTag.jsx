// The small yellow "Admin" / green "Student" label.
export default function RoleTag({ role }) {
  return <span className={`role-tag role-${role}`}>{role === 'admin' ? 'Admin' : 'Student'}</span>;
}
