from pathlib import Path
p=Path('tests/unit/acta-analysis.test.ts');s=p.read_text(encoding='utf-8-sig');i=s.rfind('});')
s=s[:i]+'''  it("representa una remontada dentro del cuarto, no solo el resultado final", () => {
    const result = actaAnalysis(sheet([
      ...Array.from({ length: 3 }, () => event("goal", { side: "them", cap: 3, keeper: 10 })),
      ...Array.from({ length: 4 }, () => event("goal")),
      event("goal", { deleted: true }),
    ]));
    expect(result.goalProgression.filter(p => p.quarter === null).map(p => [p.us, p.them])).toEqual([[0,1],[0,2],[0,3],[1,3],[2,3],[3,3],[4,3]]);
    expect(result.goalProgression.at(-1)).toMatchObject({ quarter: 1, us: 4, them: 3, position: 1 });
  });
  it("marca también los cuartos sin goles y mantiene el marcador importado", () => {
    const result = actaAnalysis(sheet([], { phase: "finished", baselineThem: 2 }));
    expect(result.goalProgression.map(p => p.quarter)).toEqual([0,1,2,3,4]);
    expect(result.goalProgression.every(p => p.us === 0 && p.them === 2)).toBe(true);
  });
''' +s[i:];p.write_text(s,encoding='utf-8')
