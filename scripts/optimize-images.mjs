#!/usr/bin/env node
// Convierte fotografías originales a WebP en dos tamaños (400 px y 800 px de ancho).
// SOLO redimensiona y comprime: no recorta, no retoca ni altera el producto.
//
// Uso:
//   npm install
//   npm run images -- <carpeta-origen> [carpeta-destino]
//   ej.: npm run images -- catalogo-original/fotos assets/images
//
// Por cada foto "producto-001.jpg" genera:
//   producto-001-400.webp  → campo "imageSmall"
//   producto-001-800.webp  → campo "image"
// e imprime los valores de imageWidth/imageHeight para products.json.

import { readdir, mkdir } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const [source, target = 'assets/images'] = process.argv.slice(2);
if (!source) {
  console.error('Uso: npm run images -- <carpeta-origen> [carpeta-destino]');
  process.exit(1);
}

const SIZES = [400, 800];
const QUALITY = 82; // alta calidad para fotografía de producto
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']);

await mkdir(target, { recursive: true });
const files = (await readdir(source)).filter((f) => EXTENSIONS.has(parse(f).ext.toLowerCase()));

for (const file of files) {
  const { name } = parse(file);
  const input = sharp(join(source, file)).rotate(); // respeta la orientación EXIF
  let largest;
  for (const width of SIZES) {
    const info = await input
      .clone()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(join(target, `${name}-${width}.webp`));
    largest = info;
  }
  console.log(`${file} → ${name}-{${SIZES.join(',')}}.webp  ("imageWidth": ${largest.width}, "imageHeight": ${largest.height})`);
}

console.log(`\n${files.length} imagen(es) procesada(s) en ${target}`);
