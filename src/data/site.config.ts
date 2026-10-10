/**
 * Semua teks & data statis website ada di sini.
 * Ganti nilai bertanda [ ... ] sebelum rilis (Requirement.md §8).
 */
export const site = {
  name: 'Rasyid',
  fullName: 'Abdurrasyid Ridho',
  role: 'Data Engineer',
  tagline: 'Data engineer building reliable pipelines from raw source to insight.',
  description:
    'I build pipelines that turn messy raw data into clean, reliable tables and dashboards your team can actually decide with.',
  status: { available: true, label: 'Available for data projects' },
  location: { city: 'Bandung, ID', detail: 'UTC+7 · remote-friendly', country: 'Indonesia' },
  email: '[your@email.com]',
  github: process.env.GITHUB_USERNAME || '[username]',
  social: {
    github: `https://github.com/${process.env.GITHUB_USERNAME || '[username]'}`,
    linkedin: 'https://linkedin.com/in/[username]',
  },
  sourceRepo: '[portfolio-repo]',
  stack: [
    'Python',
    'SQL',
    'Apache Airflow',
    'dbt',
    'Apache Spark',
    'Kafka',
    'BigQuery',
    'PostgreSQL',
    'Docker',
    'GCP',
    'AWS',
  ],
  pipeline: [
    { stage: 'SOURCE', tool: 'API · CSV' },
    { stage: 'INGEST', tool: 'Airflow' },
    { stage: 'TRANSFORM', tool: 'dbt · Spark' },
    { stage: 'SERVE', tool: 'BigQuery' },
  ],
  services: [
    { t: 'ETL / ELT pipelines', d: 'Automated ingestion from APIs, databases and files, scheduled and monitored.' },
    { t: 'Data warehouse', d: 'Modeled, documented tables in BigQuery or PostgreSQL ready for analysis.' },
    { t: 'Dashboards', d: 'Clear, animated reports on top of clean data your team trusts.' },
    { t: 'Data quality', d: 'Tests and alerts that catch broken data before it reaches decisions.' },
  ],
} as const;
