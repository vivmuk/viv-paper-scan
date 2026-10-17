import type { Metadata } from 'next';
import { RegisterView } from '@/components/scan-views';
export const metadata: Metadata = { title: 'The Register' };
export default function ScanPage() { return <RegisterView />; }
