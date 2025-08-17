/* ===== Subcomponents ===== */

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type Siswa = {
  id: string;
  nama: string;
  kelas: string;
  bintang: number;
  lastMonthBintang?: number;
  // photoURL?: string;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => (n?.[0] ?? "").toUpperCase())
    .join("");

// ===== PodiumCard =====
export function PodiumCard({
  rank,
  data,
  height,
  highlight = false,
}: {
  rank: 1 | 2 | 3;
  data?: Siswa;
  height: string;
  highlight?: boolean;
}) {
  const ring = highlight ? "ring-2 ring-white/80" : "ring-1 ring-white/40";
  const shade = highlight ? "bg-white/10" : "bg-white/5";

  return (
    <div className="flex flex-col items-center">
      {/* avatar + name */}
      <div className="mb-3 flex flex-col items-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold ${ring}`}
        >
          {data ? initials(data.nama) : "-"}
        </div>
        <div className="mt-2 text-center">
          <div className="line-clamp-1 text-sm font-semibold">
            {data?.nama ?? "—"}
          </div>
          <div className="text-xs text-white/80">{data?.kelas ?? ""}</div>
        </div>
      </div>

      {/* podium block */}
      <div
        className={`flex ${height} w-full items-center justify-center rounded-xl ${shade}`}
      >
        <div className="text-3xl font-bold">{rank}</div>
      </div>
    </div>
  );
}

// ===== Trend =====
export function Trend({ last, now }: { last?: number; now: number }) {
  if (typeof last !== "number") return null;

  const diff = now - last;
  if (diff === 0) {
    return (
      <span className="whitespace-nowrap text-xs text-gray-400">
        0 dari bulan lalu
      </span>
    );
  }

  if (diff > 0) {
    return (
      <span className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-600">
        <ArrowUpRight className="h-4 w-4" />
        +{diff} dari bulan lalu
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-rose-600">
      <ArrowDownRight className="h-4 w-4" />
      {diff} dari bulan lalu
    </span>
  );
}