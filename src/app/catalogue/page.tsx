import type { Metadata } from 'next';
import { CatalogueView } from '@/components/catalogue-view';
export const metadata: Metadata = { title: 'A Catalogue of Enquiries' };
export default function CataloguePage() { return <CatalogueView />; }
