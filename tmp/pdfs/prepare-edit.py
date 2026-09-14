from pathlib import Path
p=Path('lib/domain/acta-pdf.ts')
s=p.read_text(encoding='utf-8-sig')
start=s.index('  fill(0, 0, 297, 2, NAVY);')
end=s.index('  y = newPage("El partido, cuarto a cuarto");',start)
Path('tmp/pdfs/timeline-tail.txt').write_text(s[end:],encoding='utf-8')
p.write_text(s[:start],encoding='utf-8')
