import "dotenv/config";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const main = () => {
  const filePath = path.resolve("rival-analysis.xlsx");
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets["ライバル分析"]!;
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  const evalsRaw = fs.readFileSync(path.resolve("src/scripts/evaluations.json"), "utf-8");
  const evals: [number, number, number][] = JSON.parse(evalsRaw);

  if (evals.length !== data.length) {
    console.error(`件数不一致: Excel=${data.length}, 評価=${evals.length}`);
    process.exit(1);
  }

  const updatedRows = data.map((row, i) => {
    const [s, r, a] = evals[i]!;
    return {
      ...row,
      自分事化: s,
      射程: r,
      覚醒度: a,
      合計: s + r + a,
    };
  });

  // 合計スコア降順 → 再生回数降順
  updatedRows.sort((a, b) => {
    const scoreA = (a["合計"] as number) || 0;
    const scoreB = (b["合計"] as number) || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return ((b["再生回数"] as number) || 0) - ((a["再生回数"] as number) || 0);
  });

  const newWs = XLSX.utils.json_to_sheet(updatedRows);
  newWs["!cols"] = [
    { wch: 25 },
    { wch: 50 },
    { wch: 12 },
    { wch: 12 },
    { wch: 50 },
    { wch: 45 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 30 },
  ];

  wb.Sheets["ライバル分析"] = newWs;
  XLSX.writeFile(wb, filePath);

  console.log(`✅ 評価完了: ${updatedRows.length}件`);
  console.log(`📄 出力: ${filePath}`);

  // スコア分布
  for (let s = 9; s >= 3; s--) {
    const count = updatedRows.filter((r) => r["合計"] === s).length;
    if (count > 0) console.log(`  スコア${s}: ${count}件`);
  }
};

main();
