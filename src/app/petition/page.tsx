import type { Metadata } from 'next';
import { PetitionView } from '@/components/petition-view';
export const metadata: Metadata = { title: 'The Petition' };
export default function PetitionPage() { return <PetitionView />; }
