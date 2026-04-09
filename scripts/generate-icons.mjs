import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { ImageResponse } from 'next/og.js';

const root = process.cwd();
const palette = {
  paper: '#f8f5ef',
  paperShade: '#efe7da',
  spine: '#2c5f4e',
  spineDark: '#214a3d',
  bookmark: '#c4884a',
  shadow: 'rgba(26, 23, 20, 0.14)',
};

function iconMarkup(size) {
  const radius = Math.round(size * 0.24);
  const shellPadding = size * 0.12;
  const bookHeight = size * 0.54;
  const bookWidth = size * 0.62;
  const pageWidth = bookWidth * 0.42;
  const pageHeight = bookHeight * 0.9;
  const bookmarkWidth = size * 0.1;
  const bookmarkHeight = size * 0.26;

  return React.createElement(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle at 30% 25%, #fffdf8 0%, ${palette.paper} 58%, ${palette.paperShade} 100%)`,
      },
    },
    React.createElement(
      'div',
      {
        style: {
          width: size,
          height: size,
          padding: shellPadding,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            width: '100%',
            height: '100%',
            borderRadius: radius,
            background: `linear-gradient(145deg, #fcfaf5 0%, ${palette.paper} 45%, ${palette.paperShade} 100%)`,
            boxShadow: `0 ${Math.round(size * 0.028)}px ${Math.round(size * 0.08)}px ${palette.shadow}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          },
        },
        React.createElement('div', {
          style: {
            position: 'absolute',
            width: size * 0.62,
            height: size * 0.62,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.45)',
            filter: 'blur(10px)',
            top: size * 0.05,
            left: size * 0.08,
          },
        }),
        React.createElement(
          'div',
          {
            style: {
              width: bookWidth,
              height: bookHeight,
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'center',
              position: 'relative',
              transform: 'translateY(2%)',
            },
          },
          React.createElement('div', {
            style: {
              position: 'absolute',
              left: '50%',
              top: size * 0.02,
              width: size * 0.028,
              height: bookHeight * 0.88,
              borderRadius: 999,
              background: palette.spineDark,
              transform: 'translateX(-50%)',
            },
          }),
          React.createElement('div', {
            style: {
              width: pageWidth,
              height: pageHeight,
              borderRadius: `${Math.round(size * 0.06)}px ${Math.round(size * 0.02)}px ${Math.round(size * 0.02)}px ${Math.round(size * 0.08)}px`,
              background: 'linear-gradient(180deg, #fffefb 0%, #f3ecdf 100%)',
              border: `${Math.max(2, Math.round(size * 0.012))}px solid rgba(44, 95, 78, 0.14)`,
              borderRight: 'none',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.45)',
              transform: 'skewY(-7deg)',
            },
          }),
          React.createElement('div', {
            style: {
              width: bookWidth * 0.13,
              height: bookHeight,
              borderRadius: `${Math.round(size * 0.04)}px`,
              background: `linear-gradient(180deg, ${palette.spine} 0%, ${palette.spineDark} 100%)`,
              boxShadow: `0 ${Math.round(size * 0.012)}px ${Math.round(size * 0.04)}px rgba(33,74,61,0.28)`,
            },
          }),
          React.createElement('div', {
            style: {
              position: 'absolute',
              top: size * 0.02,
              left: bookWidth * 0.565,
              width: bookmarkWidth,
              height: bookmarkHeight,
              background: palette.bookmark,
              clipPath: 'polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)',
              boxShadow: `0 ${Math.round(size * 0.01)}px ${Math.round(size * 0.025)}px rgba(196,136,74,0.28)`,
            },
          }),
          React.createElement('div', {
            style: {
              width: pageWidth,
              height: pageHeight,
              borderRadius: `${Math.round(size * 0.02)}px ${Math.round(size * 0.06)}px ${Math.round(size * 0.08)}px ${Math.round(size * 0.02)}px`,
              background: 'linear-gradient(180deg, #fffefb 0%, #f3ecdf 100%)',
              border: `${Math.max(2, Math.round(size * 0.012))}px solid rgba(44, 95, 78, 0.14)`,
              borderLeft: 'none',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.45)',
              transform: 'skewY(7deg)',
            },
          })
        )
      )
    )
  );
}

async function renderPng(size, destination) {
  const response = new ImageResponse(iconMarkup(size), {
    width: size,
    height: size,
  });

  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes);
  return bytes;
}

async function writeIco(entries, destination) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(entries.length * 16);
  let offset = header.length + directory.length;

  entries.forEach((entry, index) => {
    const base = index * 16;
    directory[base] = entry.size >= 256 ? 0 : entry.size;
    directory[base + 1] = entry.size >= 256 ? 0 : entry.size;
    directory[base + 2] = 0;
    directory[base + 3] = 0;
    directory.writeUInt16LE(1, base + 4);
    directory.writeUInt16LE(32, base + 6);
    directory.writeUInt32LE(entry.bytes.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += entry.bytes.length;
  });

  const payload = Buffer.concat([header, directory, ...entries.map((entry) => entry.bytes)]);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, payload);
}

const pngTargets = [
  { size: 180, destination: path.join(root, 'app/apple-icon.png') },
  { size: 512, destination: path.join(root, 'app/icon.png') },
  { size: 192, destination: path.join(root, 'public/icon-192.png') },
  { size: 512, destination: path.join(root, 'public/icon-512.png') },
];

const icoSizes = [16, 32, 48];

async function main() {
  await Promise.all(pngTargets.map(({ size, destination }) => renderPng(size, destination)));

  const icoEntries = await Promise.all(
    icoSizes.map(async (size) => ({
      size,
      bytes: await renderPng(size, path.join(root, `.tmp/favicon-${size}.png`)),
    }))
  );

  await writeIco(icoEntries, path.join(root, 'app/favicon.ico'));
  await fs.rm(path.join(root, '.tmp'), { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
