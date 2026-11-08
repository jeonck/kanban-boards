// src/ 의 모듈을 보드별 단일 HTML(dist/)로 묶는다.
// 아티팩트는 이 단일 파일을 게시한다. 사용법: node build.mjs [content|dev]
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFile(path.join(root, rel), "utf8");

const BOARDS = [
  { id: "content", out: "content-board.html" },
  { id: "dev", out: "dev-board.html" },
];

// CSS 순서: 보드 토큰 → 공통(기반·열·편집창·데이터) → 보드 전용 → 공통 모바일 → 보드 모바일
function cssFiles(id) {
  const b = (n) => `src/boards/${id}/styles/${n}.css`;
  return [
    b("tokens"),
    ...["base", "board", "editor", "data"].map((n) => `src/styles/${n}.css`),
    b("filters"),
    b("card"),
    b("editor"),
    b("insights"),
    "src/styles/mobile.css",
    b("mobile"),
  ];
}

// <!--@include 경로--> 를 파일 내용으로 바꾼다. 중첩 include도 처리한다.
async function expand(html, depth = 0) {
  if (depth > 5) throw new Error("include 중첩이 너무 깊어요");
  const re = /<!--\s*@include\s+(\S+)\s*-->/;
  let m;
  while ((m = re.exec(html))) {
    const part = await expand((await read(m[1])).trimEnd(), depth + 1);
    html = html.replace(m[0], () => part);
  }
  return html;
}

async function buildBoard({ id, out }) {
  const css = (await Promise.all(cssFiles(id).map(read))).map((s) => s.trim()).join("\n\n");
  const bundle = await build({
    entryPoints: [path.join(root, `src/boards/${id}/main.js`)],
    bundle: true,
    format: "iife",
    target: "es2020",
    write: false,
    legalComments: "none",
    logLevel: "silent",
  });
  const js = bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
  let html = await expand(await read(`src/boards/${id}/template.html`));
  html = html.replace("<!--@css-->", () => `<style>\n${css}\n</style>`).replace("<!--@js-->", () => `<script>\n${js}</script>`);
  await mkdir(path.join(root, "dist"), { recursive: true });
  await writeFile(path.join(root, "dist", out), html);
  console.log(`built dist/${out} (${(html.length / 1024).toFixed(1)} KB)`);
}

const only = process.argv[2];
for (const b of BOARDS) if (!only || only === b.id) await buildBoard(b);
