#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const productRel = "src/routes/product.$slug.tsx";
const productPath = path.join(root, productRel);
const backupDir = path.join(root, ".jmb-phase11-backup");

function fail(message) {
  console.error(`\nPhase 11 stopped: ${message}`);
  process.exit(1);
}

function backup(rel) {
  const source = path.join(root, rel);
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(backupDir, { recursive: true });
  const target = path.join(backupDir, rel.replaceAll("/", "__"));
  if (!fs.existsSync(target)) fs.copyFileSync(source, target);
}

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) {
    console.log(`Already patched: ${label}`);
    return source;
  }
  const count = source.split(before).length - 1;
  if (count !== 1) fail(`${label}: expected exactly one matching code block, found ${count}.`);
  return source.replace(before, after);
}

function patchProductRoute() {
  if (!fs.existsSync(productPath)) fail(`Missing ${productRel}.`);
  backup(productRel);
  let source = fs.readFileSync(productPath, "utf8");

  if (!source.includes("fetchLiveCatalogItems") || !source.includes("const liveGroups = useMemo")) {
    fail(`${productRel} does not contain the live catalog gallery from Operational Phase 6.`);
  }

  const displayLine = `  const displayDesignName = (item: (typeof designs)[number] | undefined) => item ? (designLabels[item.id] ?? item.name) : product.name;`;
  const helperBlock = `${displayLine}\n  const normalizeCatalogLabel = (value: string | null | undefined) =>\n    (value ?? \"\")\n      .toLowerCase()\n      .replace(/&/g, \"and\")\n      .replace(/[^a-z0-9]+/g, \" \" )\n      .trim();\n  const findLiveGroupForDesign = (item: (typeof designs)[number]) => {\n    const imageMatch = liveGroups.find((group) => group.image && group.image === item.image);\n    if (imageMatch) return imageMatch;\n\n    const designNames = [displayDesignName(item), item.name]\n      .map(normalizeCatalogLabel)\n      .filter(Boolean);\n\n    return liveGroups.find((group) => {\n      const liveNames = [group.name, group.team]\n        .map(normalizeCatalogLabel)\n        .filter(Boolean);\n      return designNames.some((designName) =>\n        liveNames.some((liveName) =>\n          liveName === designName ||\n          (liveName.length > 4 && designName.length > 4 &&\n            (liveName.includes(designName) || designName.includes(liveName))),\n        ),\n      );\n    }) ?? null;\n  };`;

  if (!source.includes("const findLiveGroupForDesign")) {
    if (!source.includes(displayLine)) fail("Could not find the product design-name helper.");
    source = source.replace(displayLine, helperBlock);
    console.log("Added existing-design → live-product matcher.");
  } else {
    console.log("Already patched: live-product matcher");
  }

  const chooseKoozieBlock = `  const chooseKoozieDesign = (group: (typeof koozieGroups)[number]) => {\n    setSelectedKoozieDesign(group.name); setSelectedReadyId(null); setQuantity(1);\n    const staticIndex = designs.findIndex((designItem) => designItem.image === group.image);\n    if (staticIndex >= 0) setSelectedIndex(staticIndex);\n  };`;
  const chooseStaticBlock = `${chooseKoozieBlock}\n\n  const chooseStaticDesign = (item: (typeof designs)[number], index: number) => {\n    setSelectedIndex(index);\n    setQuantity(1);\n    const linkedGroup = findLiveGroupForDesign(item);\n\n    if (!linkedGroup) {\n      setSelectedReadyId(null);\n      setSelectedKoozieDesign(null);\n      return;\n    }\n\n    if (isKoozie) {\n      setSelectedKoozieDesign(linkedGroup.name);\n      setSelectedReadyId(null);\n    } else {\n      setSelectedKoozieDesign(null);\n      setSelectedReadyId(linkedGroup.variants[0]?.id ?? null);\n    }\n  };\n\n  const isStaticDesignActive = (item: (typeof designs)[number], index: number) => {\n    const linkedGroup = findLiveGroupForDesign(item);\n    if (!linkedGroup) return !selectedReady && !selectedGroup && selectedIndex === index;\n    return isKoozie\n      ? selectedKoozieDesign === linkedGroup.name\n      : selectedReady?.name === linkedGroup.name;\n  };`;

  if (!source.includes("const chooseStaticDesign")) {
    if (!source.includes(chooseKoozieBlock)) fail("Could not find the existing live-design selection helper.");
    source = source.replace(chooseKoozieBlock, chooseStaticBlock);
    console.log("Added linked static-thumbnail selection.");
  } else {
    console.log("Already patched: linked static-thumbnail selection");
  }

  const oldThumb = `{designs.map((item, index) => <button key={item.id} type="button" onClick={() => { setSelectedReadyId(null); setSelectedKoozieDesign(null); setSelectedIndex(index); }} className={\`overflow-hidden rounded-xl border p-1 \${!selectedReady && !selectedGroup && selectedIndex === index ? "border-primary ring-2 ring-primary/15" : "border-border"}\`}><img src={item.image} alt={displayDesignName(item)} className="aspect-[4/5] w-full rounded-lg object-cover" loading="lazy" /></button>)}`;
  const newThumb = `{designs.map((item, index) => <button key={item.id} type="button" onClick={() => chooseStaticDesign(item, index)} className={\`overflow-hidden rounded-xl border p-1 \${isStaticDesignActive(item, index) ? "border-primary ring-2 ring-primary/15" : "border-border"}\`}><img src={item.image} alt={displayDesignName(item)} className="aspect-[4/5] w-full rounded-lg object-cover" loading="lazy" /></button>)}`;
  source = replaceOnce(source, oldThumb, newThumb, "top gallery thumbnails");

  const oldCollection = `{designs.map((item, index) => <button key={item.id} type="button" onClick={() => { setSelectedReadyId(null); setSelectedKoozieDesign(null); setSelectedIndex(index); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-[1.5rem] border border-border bg-card p-3 text-left shadow-soft transition-transform hover:-translate-y-1"><img src={item.image} alt={displayDesignName(item)} className="aspect-[4/5] w-full rounded-[1.1rem] object-cover" loading="lazy" /><p className="px-2 pb-1 pt-3 text-sm font-bold">{displayDesignName(item)}</p></button>)}`;
  const newCollection = `{designs.map((item, index) => <button key={item.id} type="button" onClick={() => { chooseStaticDesign(item, index); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-[1.5rem] border border-border bg-card p-3 text-left shadow-soft transition-transform hover:-translate-y-1"><img src={item.image} alt={displayDesignName(item)} className="aspect-[4/5] w-full rounded-[1.1rem] object-cover" loading="lazy" /><p className="px-2 pb-1 pt-3 text-sm font-bold">{displayDesignName(item)}</p></button>)}`;
  source = replaceOnce(source, oldCollection, newCollection, "All Designs static cards");

  fs.writeFileSync(productPath, source);
  console.log(`Updated ${productRel}`);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && /\.(tsx|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function matchingTagEnd(source, openStart, tag) {
  const token = new RegExp(`<\\/?${tag}\\b[^>]*>`, "g");
  token.lastIndex = openStart;
  let depth = 0;
  let match;
  while ((match = token.exec(source))) {
    const text = match[0];
    const closing = text.startsWith("</");
    const selfClosing = /\/\s*>$/.test(text);
    if (closing) depth -= 1;
    else if (!selfClosing) depth += 1;
    if (depth === 0) return token.lastIndex;
  }
  return -1;
}

function findPresentationCard(source) {
  const marker = /presentation\s+links/i.exec(source);
  if (!marker) return null;
  const before = source.slice(0, marker.index);
  const candidates = [];
  const open = /<(div|aside|section|nav)\b[^>]*>/gi;
  let match;
  while ((match = open.exec(before))) candidates.push({ start: match.index, tag: match[1] });

  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const candidate = candidates[i];
    const end = matchingTagEnd(source, candidate.start, candidate.tag);
    if (end < 0 || end <= marker.index) continue;
    const block = source.slice(candidate.start, end);
    if (/customer\s+portal/i.test(block) && /custom\s+chat/i.test(block) && /admin\s+dashboard/i.test(block)) {
      return { start: candidate.start, end };
    }
  }
  return null;
}

function removePresentationLinks() {
  const files = walk(path.join(root, "src"));
  let removed = 0;
  for (const file of files) {
    let source = fs.readFileSync(file, "utf8");
    let changed = false;
    while (/presentation\s+links/i.test(source)) {
      const card = findPresentationCard(source);
      if (!card) break;
      const rel = path.relative(root, file);
      backup(rel);
      let start = card.start;
      let end = card.end;
      while (start > 0 && source[start - 1] === " ") start -= 1;
      if (start > 0 && source[start - 1] === "\n") start -= 1;
      while (end < source.length && (source[end] === " " || source[end] === "\t")) end += 1;
      if (source[end] === "\n") end += 1;
      source = source.slice(0, start) + source.slice(end);
      removed += 1;
      changed = true;
      console.log(`Removed Presentation Links card from ${rel}`);
    }
    if (changed) fs.writeFileSync(file, source);
  }

  if (removed === 0) {
    console.log("Presentation Links card was not found. It may already be removed.");
  }
}

patchProductRoute();
removePresentationLinks();

console.log("\nOperational Phase 11 applied.");
console.log("• Existing gallery thumbnails now select their matching live Supabase product when image/name matches.");
console.log("• The old Presentation Links card is removed from the public UI.");
console.log("• Existing product images are reused. Nothing is reuploaded.");
console.log("• No SQL migration is required.");
console.log("\nNext: npm run build");
