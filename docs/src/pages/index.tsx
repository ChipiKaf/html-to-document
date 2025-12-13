import React, { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          Convert HTML to DOCX, PDF, and More
        </Heading>
        <p className="hero__subtitle">
          A modular TypeScript library for generating rich, styled documents
          from HTML — with extensibility at its core.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/api/html-to-document"
          >
            📘 Docs Overview
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/api/html-to-document"
          >
            🧩 API Reference
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="https://github.com/ChipiKaf/html-to-document"
          >
            ⭐ GitHub
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="https://html-to-document-demo.vercel.app/"
          >
            🚀 Live Demo
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Welcome to ${siteConfig.title}`}
      description="html-to-document: Convert HTML to rich DOCX, PDF, and more. Flexible, extensible, and developer-friendly."
    >
      <HomepageHeader />
      <main>
        <div className="container padding-vert--lg">
          <Heading as="h2">Get Started</Heading>
          <p>
            Install and use the library in your TypeScript/JavaScript project:
          </p>
          <CodeBlock
            language="ts"
            children={`npm install html-to-document

import { init, DocxAdapter } from 'html-to-document';

const converter = init({
  adapters: {
    register: [
      { format: 'docx', adapter: DocxAdapter },
    ],
  },
});

const parsed = await converter.parse('<h1>Hello</h1>');
const docx = await converter.convert(parsed, 'docx');`}
          />

          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/intro"
            >
              Get Started →
            </Link>
          </div>

          <div className="margin-top--lg">
            <p>
              Try the live TinyMCE integration demo:
              <br />
              <Link
                to="https://html-to-document-demo.vercel.app"
                target="_blank"
              >
                🔗 html-to-document-demo.vercel.app →
              </Link>
            </p>
          </div>

          <div className="row margin-top--xl">
            <div className="col col--4">
              <h3>🧱 Modular Architecture</h3>
              <p>
                Compose your own converter pipeline using adapters, style
                mappings, and custom middleware.
              </p>
            </div>
            <div className="col col--4">
              <h3>📄 Professional Output</h3>
              <p>
                Generate DOCX, PDF, or other document formats with full control
                over layout and styles.
              </p>
            </div>
            <div className="col col--4">
              <h3>💡 Developer-Friendly</h3>
              <p>
                Written in modern TypeScript with full typings, clean APIs, and
                extensibility in mind.
              </p>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
