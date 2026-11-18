import { Modal } from './Modal'
import { useUi } from '../store/useUi'
import styles from './ConfirmDialog.module.scss'

export function ConfirmDialog() {
  const confirm = useUi((state) => state.confirm)
  const closeConfirm = useUi((state) => state.closeConfirm)

  const handleConfirm = () => {
    const action = confirm.onConfirm
    closeConfirm()
    action?.()
  }

  return (
    <Modal
      open={confirm.open}
      onClose={closeConfirm}
      title={confirm.title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            className={`${styles.button} ${styles.ghost}`}
            onClick={closeConfirm}
          >
            取消
          </button>
          <button
            type="button"
            className={`${styles.button} ${confirm.tone === 'danger' ? styles.danger : styles.primary}`}
            onClick={handleConfirm}
          >
            {confirm.confirmLabel}
          </button>
        </>
      }
    >
      <p className={styles.body}>{confirm.description}</p>
    </Modal>
  )
}
