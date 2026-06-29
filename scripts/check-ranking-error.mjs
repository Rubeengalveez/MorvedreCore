const resp = await fetch("http://localhost:3000/rankings", { redirect: "manual" });
const html = await resp.text();
const matches = [...html.matchAll(/"message":"([^"]+)"/g)].map((m) => m[1]);
console.log("Messages:", matches.slice(0, 5));
const stack = [...html.matchAll(/"stack":"([^"]+)"/g)].map((m) => m[1].slice(0, 300));
console.log("Stacks:", stack.slice(0, 3));
const digest = [...html.matchAll(/"digest":"([^"]+)"/g)].map((m) => m[1]);
console.log("Digests:", digest);
