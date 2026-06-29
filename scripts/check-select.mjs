const resp = await fetch("http://localhost:3000/rankings", { redirect: "manual" });
const html = await resp.text();
const sel = html.match(/<select[^>]*data-scope-select[^>]*>([\s\S]*?)<\/select>/);
console.log("Select encontrado:", sel ? "SI" : "NO");
if (sel) {
  console.log("First 600 chars:", sel[0].slice(0, 600));
}
const sticky = html.match(/sticky[^"]*top-\[60px\][^"]*"/);
console.log("Sticky element:", sticky ? sticky[0] : "NO");
const z10 = html.match(/z-10/g);
console.log("z-10 occurrences:", z10?.length);
