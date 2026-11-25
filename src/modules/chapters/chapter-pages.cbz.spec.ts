import { readCbz } from './chapter-pages.cbz.js';
import { makeCbz, pagePng } from '../../../test/fixtures/cbz.js';

const archive = (buffer: Buffer, originalname = 'chapter.cbz') =>
  ({ buffer, originalname }) as Express.Multer.File;

describe('CBZ reader', () => {
  it('reads nested images and ignores metadata and OS files', async () => {
    const files = await readCbz(
      archive(
        makeCbz([
          { name: 'chapter/5.PNG', data: pagePng },
          { name: 'ComicInfo.xml', data: Buffer.from('<ComicInfo/>') },
          { name: '__MACOSX/._5.png', data: Buffer.from('metadata') },
        ]),
      ),
    );
    expect(files).toEqual([
      { originalname: '5.PNG', mimetype: 'image/png', buffer: pagePng },
    ]);
  });
  it('rejects missing, wrong-extension and invalid archives', async () => {
    await expect(readCbz()).rejects.toThrow('archive');
    await expect(
      readCbz(archive(Buffer.from('bad'), 'chapter.rar')),
    ).rejects.toThrow('archive');
    await expect(readCbz(archive(Buffer.from('bad')))).rejects.toThrow(
      'Invalid',
    );
  });
  it.each([
    {
      name: 'no images',
      entries: [{ name: 'ComicInfo.xml', data: Buffer.from('xml') }],
    },
    {
      name: 'encrypted',
      entries: [{ name: '1.png', data: pagePng, encrypted: true }],
    },
    { name: 'unsafe path', entries: [{ name: '../1.png', data: pagePng }] },
    {
      name: 'oversized image',
      entries: [{ name: '1.png', data: Buffer.alloc(10 * 1024 * 1024 + 1) }],
    },
  ])('rejects $name', async ({ entries }) => {
    await expect(readCbz(archive(makeCbz(entries)))).rejects.toThrow();
  });
  it('accepts archives with more than 1000 image entries', async () => {
    const entries = Array.from({ length: 1001 }, (_, i) => ({
      name: i + '.png',
      data: pagePng,
    }));
    expect(await readCbz(archive(makeCbz(entries)))).toHaveLength(1001);
  });
  it('rejects truncated and CRC-corrupted archives', async () => {
    const zip = makeCbz([{ name: '1.png', data: pagePng }]);
    await expect(
      readCbz(archive(zip.subarray(0, zip.length - 8))),
    ).rejects.toThrow();
    const central = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    zip.writeUInt32LE(0, central + 16);
    await expect(readCbz(archive(zip))).rejects.toThrow('corrupted');
  });
});
