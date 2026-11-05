import { Brand } from "./brand";
import { legalContent } from "./legal";
export function LegalPage({ path }: { path: string }) {
  const page = legalContent[path];
  return (
    <div className="legal-page">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <a href="/" aria-label="Peak Unemployment home">
          <Brand />
        </a>
        <a href="/">Back to the conversation ↗</a>
      </header>
      <main id="main-content" className="content-page">
        <span className="eyebrow">PEAK UNEMPLOYMENT · THE HOUSE RULES</span>
        <h1>{page.title}</h1>
        <p className="page-intro">{page.intro}</p>
        {page.sections.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
        <a className="text-link" href="/">
          Read the conversation ↗
        </a>
      </main>
    </div>
  );
}
