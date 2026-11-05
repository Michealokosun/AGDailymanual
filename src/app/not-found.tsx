import Link from "next/link";

export default function NotFound() {
  return <div className="not-found"><p className="overline">READING NOT FOUND</p><h1>We couldn’t find that reading.</h1><Link className="button button--navy" href="/">Back to home <span aria-hidden="true">→</span></Link></div>;
}
