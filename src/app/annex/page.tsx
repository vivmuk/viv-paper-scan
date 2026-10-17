import type { Metadata } from 'next';
import { AnnexView } from '@/components/annex-view';
export const metadata: Metadata = { title: 'The Instruments Annex' };
export default function AnnexPage() { return <AnnexView />; }
