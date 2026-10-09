import AnnouncementsAndPollsManager from '@/components/admin/AnnouncementsAndPollsManager';

export const metadata = {
  title: 'Announcements & Community Polls | Admin Command Center',
  description: 'Live notice engagement telemetry, CTR tracking, and historic community poll responses.',
};

export default function AdminSurveyPage() {
  return <AnnouncementsAndPollsManager />;
}
