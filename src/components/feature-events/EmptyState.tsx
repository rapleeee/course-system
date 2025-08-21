import { Card } from "../ui/card";

export function EmptyState() {
  return (
    <Card className="p-10 text-center">
      <h3 className="text-lg font-semibold mb-2">Belum ada event yang cocok</h3>
      <p className="text-muted-foreground">Coba ubah kata kunci atau filter kategori/mode.</p>
    </Card>
  )
}