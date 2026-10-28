import { FileSpreadsheet, Upload } from 'lucide-react'

export default function UploadZone({ onFiles, disabled }) {
  function handleDrop(event) {
    event.preventDefault()
    if (!disabled) onFiles([...event.dataTransfer.files])
  }

  return (
    <div className="upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <div className="upload-icon" aria-hidden="true"><Upload size={22} /></div>
      <div>
        <p className="upload-title">Arrastra tus archivos Excel aquí</p>
        <p className="upload-subtitle"><FileSpreadsheet size={14} /> o selecciona uno o varios archivos .xlsx</p>
      </div>
      <label className="button button-primary upload-button">
        <FileSpreadsheet size={16} /> Seleccionar archivos
        <input type="file" accept=".xlsx" multiple hidden disabled={disabled} onChange={(event) => onFiles([...event.target.files])} />
      </label>
    </div>
  )
}
