"""Prepara plantillas sin actividades históricas, conservando el diseño Word original."""
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def title_placeholder(match):
    paragraph = match.group()
    # El título está dividido en múltiples runs en los originales.
    text = ''.join(re.findall(r'<w:t(?:\s[^>]*)?>(.*?)</w:t>', paragraph))
    if 'Informe Mensual de Actividades' not in text:
        return paragraph
    props = re.search(r'<w:pPr>.*?</w:pPr>', paragraph, re.S)
    return '<w:p>' + (props.group() if props else '') + '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>{{REPORT_TITLE}}</w:t></w:r></w:p>'


def prepare(source, target):
    with zipfile.ZipFile(ROOT / source) as original:
        xml = original.read('word/document.xml').decode('utf-8')
        # El primer salto de sección termina la portada con las firmas.
        section_end = xml.index('</w:sectPr>')
        cover_end = xml.index('</w:p>', section_end) + len('</w:p>')
        final_section = re.findall(r'<w:sectPr\b.*?</w:sectPr>', xml, re.S)[-1]
        xml = xml[:cover_end] + '{{REPORT_BODY}}' + final_section + '</w:body></w:document>'
        xml = re.sub(r'<w:p\b[^>]*>.*?</w:p>', title_placeholder, xml, flags=re.S)
        with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as output:
            for entry in original.infolist():
                data = original.read(entry.filename)
                if entry.filename == 'word/document.xml':
                    data = xml.encode('utf-8')
                elif entry.filename == 'word/header1.xml':
                    header = re.sub(r'<w:p\b[^>]*>.*?</w:p>', title_placeholder, data.decode('utf-8'), flags=re.S)
                    # Sustituir el párrafo completo del código, conservando sus propiedades.
                    def code(match):
                        p = match.group()
                        if 'URI-UFC-USEGBE-' not in p:
                            return p
                        return '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>{{REPORT_CODE}}</w:t></w:r></w:p>'
                    data = re.sub(r'<w:p\b[^>]*>.*?</w:p>', code, header, flags=re.S).encode('utf-8')
                output.writestr(entry, data)


if __name__ == '__main__':
    destination = ROOT / 'public' / 'informes'
    destination.mkdir(exist_ok=True)
    prepare('INFORME DE ACTIVIDADES OCTUBRELUIS.docx', destination / 'plantilla-luis.docx')
    prepare('INFORME DE ACTIVIDADES OCTUBRE yess.docx', destination / 'plantilla-yesenia.docx')
    with zipfile.ZipFile(ROOT / 'INFORME DE ACTIVIDADES OCTUBRELUIS.docx') as original:
        (destination / 'logo.png').write_bytes(original.read('word/media/image1.png'))
    print('Plantillas de Luis y Yesenia preparadas; originales intactos.')
