"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="document-page"><h1 className="masthead">THE PAGE COULD NOT BE READ</h1><p className="document-intro">Nothing has been saved. Try opening this page again.</p><button type="button" className="blue-button" onClick={reset}>Try again</button></section>;
}
