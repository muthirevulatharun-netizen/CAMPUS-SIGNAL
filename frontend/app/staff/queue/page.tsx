'use client';
import StaffComplaintTable from '../StaffComplaintTable';

export default function StaffQueuePage() {
  return (
    <StaffComplaintTable
      title="My Queue"
      subtitle="Active complaints in your assigned sectors"
      filter={(c) => !['resolved', 'closed'].includes(c.status)}
    />
  );
}
