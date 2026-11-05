"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [showSplash, setShowSplash] = useState(true);
  const pathname = usePathname();
  useEffect(() => {
    const timeout = window.setTimeout(() => setShowSplash(false), 1300);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      {showSplash && (
        <div className="splash" role="status" aria-label="Evangel Daily Meal is loading">
          <div className="splash__logo"><Image src="/ag-logo.png" alt="Assemblies of God — All the Gospel" width={240} height={240} priority /></div>
          <p className="splash__eyebrow">Assemblies of God</p>
          <p className="splash__title">Evangel Daily Meal</p>
          <p className="splash__subtitle">A daily moment in the Word.<br />Read, reflect, and grow in faith.</p>
          <div className="splash__loading" aria-hidden="true"><span /></div>
          <p className="splash__foot">Word · Reflection · Prayer</p>
        </div>
      )}
      <div className="app-frame">
        <aside className="side-rail">
          <Link className="brand" href="/" aria-label="Evangel Daily Meal home">
            <span className="brand__mark"><Image src="/ag-logo.png" alt="" width={48} height={48} /></span>
            <span><strong>Evangel</strong><small>DAILY MEAL</small></span>
          </Link>
          <nav className="side-nav" aria-label="Main navigation">
            <Link className="side-nav__link is-active" href="/"><span className="nav-icon">⌂</span>Home</Link>
            <Link className="side-nav__link" href="/#this-week"><span className="nav-icon">▦</span>This Week</Link>
          </nav>
          <div className="side-verse"><span className="side-verse__symbol">“</span><p>Your word is a lamp for my feet, a light on my path.</p><small>PSALM 119:105</small></div>
          <div className="side-footer">Assemblies of God</div>
        </aside>
        <div className="app-main">
          <header className="topbar">
            <Link className="mobile-brand" href="/">
              <Image src="/ag-logo.png" alt="" width={38} height={38} />
              <span><strong>Evangel</strong><small>DAILY MEAL</small></span>
            </Link>
            <div className="topbar__right"><span className="today-dot" /> <span>Daily devotionals</span></div>
            {pathname === "/" && <PushNotificationPrompt />}
          </header>
          <main className="main-content">{children}</main>
          <nav className="mobile-nav" aria-label="Main navigation">
            <Link href="/" className="mobile-nav__link is-active"><span>⌂</span>Home</Link>
            <Link href="/#this-week" className="mobile-nav__link"><span>▦</span>This Week</Link>
          </nav>
        </div>
      </div>
    </>
  );
}
