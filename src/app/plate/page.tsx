import type { Metadata } from 'next';
import { PlateView } from '@/components/scan-views';
export const metadata: Metadata = { title: 'The Engraved Plate' };
export default function PlatePage() { return <PlateView />; }
