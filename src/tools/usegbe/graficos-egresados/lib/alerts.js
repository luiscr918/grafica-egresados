import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

export function notifySuccess(title) {
  return Toast.fire({ icon: 'success', title })
}

export function notifyError(title, text = '') {
  return Toast.fire({ icon: 'error', title, text })
}

export function notifyInfo(title) {
  return Toast.fire({ icon: 'info', title })
}

export function showCareerHelp() {
  return Swal.fire({
    icon: 'info',
    title: 'Carrera de este archivo',
    text: 'Escribe el nombre de la carrera a la que pertenecen los egresados de este Excel. Por ejemplo: Enfermería, Administración o Desarrollo de Software.',
    confirmButtonText: 'Entendido',
  })
}

export function showResolutionHelp() {
  return Swal.fire({
    icon: 'info',
    title: 'Resolución de exportación',
    text: 'Define el tamaño y la calidad de las imágenes descargadas. 1x genera archivos más pequeños, 2x ofrece buena calidad para informes y 3x genera imágenes más grandes.',
    confirmButtonText: 'Entendido',
  })
}

export function confirmAction(title, text, confirmButtonText = 'Confirmar') {
  return Swal.fire({
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  })
}

export function showLoading(title) {
  Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
  })
}

export function closeAlert() {
  Swal.close()
}
