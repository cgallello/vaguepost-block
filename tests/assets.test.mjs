import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../", import.meta.url).pathname);

function pngInfo(relativePath) {
  const bytes = readFileSync(resolve(root, relativePath));
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${relativePath} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

test("runtime icons include every Chrome toolbar size and alpha", () => {
  for (const [file, size] of [["assets/icon16.png", 16], ["assets/icon32.png", 32], ["assets/icon48.png", 48], ["assets/icon128.png", 128]]) {
    const info = pngInfo(file);
    assert.deepEqual([info.width, info.height], [size, size], file);
    assert.equal(info.colorType, 6, `${file} must preserve transparency`);
  }
});

test("mascot assets are transparent and store artwork has approved dimensions", () => {
  for (const file of ["assets/king-idle.png", "assets/king-point.png", "assets/king-block.png"]) assert.equal(pngInfo(file).colorType, 6, `${file} must have a transparent background`);
  assert.deepEqual([pngInfo("store-assets/promo-small.png").width, pngInfo("store-assets/promo-small.png").height], [440, 280]);
  assert.deepEqual([pngInfo("store-assets/marquee.png").width, pngInfo("store-assets/marquee.png").height], [1400, 560]);
});
