from pathlib import Path
p=Path('lib/domain/acta-pdf.ts');s=p.read_text(encoding='utf-8-sig').replace('Math.max(38, 29 +','Math.max(36, 27 +')
s=s.replace('const lines = values.map((v, i) => doc.splitTextToSize(options.quiet && v === "0" ? "-" : v, widths[i] - 3) as string[]);','''const cellSizes = values.map((v, i) => options.header && !v.includes(" ") ? Math.min(size, size * (widths[i] - 3) / Math.max(1, doc.getTextWidth(v))) : size);
    const lines = values.map((v, i) => {
      doc.setFontSize(cellSizes[i]);
      const rows = doc.splitTextToSize(options.quiet && v === "0" ? "-" : v, widths[i] - 3) as string[];
      doc.setFontSize(size);
      return rows;
    });''')
s=s.replace('          size,\n          options.header ||','          cellSizes[i],\n          options.header ||')
p.write_text(s,encoding='utf-8')
