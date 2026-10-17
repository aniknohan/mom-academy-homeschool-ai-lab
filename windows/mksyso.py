# Writes a COFF .syso holding an icon resource so the Windows .exe shows the app icon.
import struct, sys
ico = open(sys.argv[1], "rb").read()
_, _, count = struct.unpack_from("<HHH", ico, 0)
imgs = []
for i in range(count):
    w, h, cc, r, planes, bpp, size, off = struct.unpack_from("<BBBBHHII", ico, 6 + 16 * i)
    imgs.append((w, h, cc, planes, bpp, ico[off:off + size]))

grp = struct.pack("<HHH", 0, 1, len(imgs))
for i, (w, h, cc, planes, bpp, data) in enumerate(imgs):
    grp += struct.pack("<BBBBHHIH", w, h, cc, 0, planes, bpp, len(data), i + 1)

# resources: {type: [(id, data)]}
res = {3: [(i + 1, im[5]) for i, im in enumerate(imgs)], 14: [(1, grp)]}
LANG = 0x0409

def dir_hdr(n):
    return struct.pack("<IIHHHH", 0, 0, 0, 0, 0, n)

# layout pass
types = sorted(res)
off = 16 + 8 * len(types)               # root dir
type_dirs = {}
for t in types:
    type_dirs[t] = off; off += 16 + 8 * len(res[t])
lang_dirs = {}
for t in types:
    for rid, _ in res[t]:
        lang_dirs[(t, rid)] = off; off += 16 + 8
data_entries = {}
for t in types:
    for rid, _ in res[t]:
        data_entries[(t, rid)] = off; off += 16
blobs = {}
for t in types:
    for rid, data in res[t]:
        off = (off + 7) & ~7
        blobs[(t, rid)] = off; off += len(data)
total = (off + 7) & ~7

buf = bytearray(total)
relocs = []
def put(o, b): buf[o:o + len(b)] = b
put(0, dir_hdr(len(types)))
for i, t in enumerate(types):
    put(16 + 8 * i, struct.pack("<II", t, 0x80000000 | type_dirs[t]))
for t in types:
    o = type_dirs[t]; put(o, dir_hdr(len(res[t])))
    for i, (rid, _) in enumerate(res[t]):
        put(o + 16 + 8 * i, struct.pack("<II", rid, 0x80000000 | lang_dirs[(t, rid)]))
for t in types:
    for rid, data in res[t]:
        o = lang_dirs[(t, rid)]; put(o, dir_hdr(1))
        put(o + 16, struct.pack("<II", LANG, data_entries[(t, rid)]))
        de = data_entries[(t, rid)]
        put(de, struct.pack("<IIII", blobs[(t, rid)], len(data), 0, 0))
        relocs.append(de)
        put(blobs[(t, rid)], data)

raw_ptr = 20 + 40
reloc_ptr = raw_ptr + total
sym_ptr = reloc_ptr + 10 * len(relocs)
fh = struct.pack("<HHIIIHH", 0x8664, 1, 0, sym_ptr, 1, 0, 0)
sh = struct.pack("<8sIIIIIIHHI", b".rsrc", 0, 0, total, raw_ptr, reloc_ptr, 0, len(relocs), 0, 0x40000040)
rel = b"".join(struct.pack("<IIH", r, 0, 3) for r in relocs)
sym = struct.pack("<8sIhHBB", b".rsrc", 0, 1, 0, 3, 0)
open(sys.argv[2], "wb").write(fh + sh + bytes(buf) + rel + sym + struct.pack("<I", 4))
print("syso", total, len(relocs))
