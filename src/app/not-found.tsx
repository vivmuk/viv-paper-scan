import Link from 'next/link';
import { Masthead } from '@/components/almanac';
export default function NotFound() {
  return <section className="document-page"><Masthead>ENQUIRY NOT FOUND</Masthead><p className="document-intro">This enquiry is not in the published catalogue.</p><Link href="/catalogue">Open the catalogue</Link></section>;
}
