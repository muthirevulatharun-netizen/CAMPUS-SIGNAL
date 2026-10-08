'use client';
import StaffComplaintTable from '../StaffComplaintTable';

export default function StaffResolvedPage() {
  return (
    <StaffComplaintTable
      title="Resolved Complaints"
      subtitle="Recently closed issues from your sectors"
      filter={(c) => ['resolved', 'closed'].includes(c.status)}
    />
  );
}
