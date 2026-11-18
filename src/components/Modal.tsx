import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'
import styles from './Modal.module.scss'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  size?: 'sm' | 'md'
  children?: ReactNode
  footer?: ReactNode
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      className={size === 'sm' ? `${styles.dialog} ${styles.sm}` : styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="关闭">
            <Icon name="close" size={18} />
          </button>
        </header>

        {children ? <div className={styles.body}>{children}</div> : null}
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </dialog>
  )
}
