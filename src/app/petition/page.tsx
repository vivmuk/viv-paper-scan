import type { Metadata } from 'next';
import { DemoNotice, Masthead } from '@/components/almanac';
import { PetitionForm } from '@/components/petition-form';
export const metadata: Metadata = { title: 'The Petition' };
// TODO: POST /api/scan; build the local brief from missing/flagged streamed results, not paper text.
export default function PetitionPage() {
  return <><DemoNotice /><header className="petition-header"><Masthead>THE PETITION</Masthead>
    <p className="document-intro">Twelve particulars wanting. Choose which to petition for.</p></header><PetitionForm /></>;
}
