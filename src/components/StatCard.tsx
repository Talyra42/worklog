import styles from './StatCard.module.scss'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  accent?: boolean
}

export function StatCard({ label, value, hint, accent = false }: StatCardProps) {
  return (
    <div className={accent ? `${styles.card} ${styles.accent}` : styles.card}>
      <span className={styles.label}>{label}</span>
      <strong className={styles.value}>{value}</strong>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </div>
  )
}
