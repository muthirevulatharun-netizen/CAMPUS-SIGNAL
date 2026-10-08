import { MessageSquare, Brain, Tags, Building2, UserCheck, GitMerge, Layers, BarChart2, TrendingUp, AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  { id: 1, title: 'Student Reports Problem', desc: 'A student submits a complaint via the portal using natural language, just like messaging a friend.', icon: MessageSquare },
  { id: 2, title: 'Text Understanding', desc: 'The NLP engine parses the text to extract context, urgency, and specific entities.', icon: Brain },
  { id: 3, title: 'Category Classification', desc: 'The report is categorized into standard taxonomies (e.g., Network, Hardware, Plumbing).', icon: Tags },
  { id: 4, title: 'Sector Detection', desc: 'The system maps the category to the responsible campus department (e.g., IT Support, Facilities).', icon: Building2 },
  { id: 5, title: 'Staff Allocation', desc: 'The issue is automatically routed to the most appropriate staff member based on load and specialty.', icon: UserCheck },
  { id: 6, title: 'Similarity Detection', desc: 'The system checks if similar complaints have been filed recently in the same location.', icon: GitMerge },
  { id: 7, title: 'Issue Grouping', desc: 'Related complaints are clustered into a single "Issue Group" to avoid duplicate work.', icon: Layers },
  { id: 8, title: 'Priority Scoring', desc: 'An algorithmic score (0-100) is assigned based on impact, severity, and frequency.', icon: BarChart2 },
  { id: 9, title: 'Trend Analysis', desc: 'Historical data is analyzed to see if this issue is occurring more frequently than normal.', icon: TrendingUp },
  { id: 10, title: 'Emerging Signal', desc: 'If a critical mass is reached, a high-priority "Signal" is generated for admin review.', icon: AlertTriangle },
  { id: 11, title: 'Team Notification', desc: 'Alerts are dispatched to the appropriate management teams and ground staff.', icon: Bell },
  { id: 12, title: 'Resolution & Feedback', desc: 'Once resolved, all affected students are automatically notified of the fix.', icon: CheckCircle2 },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-20 px-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <Link href="/" className="text-indigo-600 font-medium hover:underline mb-8 inline-block">← Back to Home</Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">The 12-Step Intelligence Pipeline</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">How Campus Signal transforms a messy, scattered complaint into actionable, prioritized intelligence in milliseconds.</p>
        </div>

        <div className="space-y-6 relative">
          {/* Vertical connecting line */}
          <div className="absolute left-8 top-10 bottom-10 w-0.5 bg-indigo-200 hidden md:block"></div>

          {STEPS.map((step) => (
            <div
              key={step.id}
              className="flex items-start gap-6 relative"
            >
              <div className="hidden md:flex relative z-10 w-16 h-16 bg-white border-4 border-indigo-100 rounded-full items-center justify-center text-indigo-600 font-bold shrink-0 shadow-sm">
                <step.icon className="w-6 h-6" />
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 hover:border-indigo-300 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 md:hidden">
                    <step.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-indigo-500 tracking-wider">STEP {step.id}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{step.title}</h3>
                <p className="text-slate-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
