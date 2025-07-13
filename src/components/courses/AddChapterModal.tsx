"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { addDoc, collection, FieldValue, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

const MySwal = withReactContent(Swal);

type Props = {
  courseId: string;
  onChapterAdded: () => void;
};


type NewChapter = {
  title: string;
  description: string;
  text?: string;
  type: "video" | "module" | "pdf";
  createdAt: FieldValue;
  videoUrl?: string;
  image?: string;
  pdfUrl?: string;
};

export default function AddChapterModal({ courseId, onChapterAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [type, setType] = useState<"video" | "module" | "pdf">("video");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    try {
      if (!title || !file) {
        MySwal.fire("Error", "Judul dan file wajib diisi.", "error");
        return;
      }

      setLoading(true);

      const storageRef = ref(storage, `chapters/${courseId}/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const newChapter: NewChapter = {
        title,
        description: shortDesc,
        text: longDesc,
        type,
        createdAt: serverTimestamp(),
      };

      if (type === "video") {
        newChapter.videoUrl = downloadURL;
      } else if (type === "module") {
        newChapter.image = downloadURL;
      } else if (type === "pdf") {
        newChapter.pdfUrl = downloadURL;
      }

      await addDoc(collection(db, "courses", courseId, "chapters"), newChapter);

      setLoading(false);
      setOpen(false);
      onChapterAdded();

      MySwal.fire("Berhasil", "Chapter berhasil ditambahkan.", "success");

      // Reset state
      setTitle("");
      setShortDesc("");
      setLongDesc("");
      setType("video");
      setFile(null);
    } catch (err) {
      console.error(err);
      setLoading(false);
      MySwal.fire("Error", "Gagal menambahkan chapter.", "error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="w-4 h-4 mr-2" />
          Tambah Chapter
        </Button>
      </DialogTrigger>

      <DialogContent aria-describedby="chapter-dialog-desc">
        <DialogHeader>
          <DialogTitle>Tambah Chapter</DialogTitle>
          <p className="text-sm text-gray-500" id="chapter-dialog-desc">
            Masukkan informasi chapter yang akan ditambahkan.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Judul Chapter"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Deskripsi Singkat"
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
          />
          <Textarea
            placeholder="Deskripsi Panjang (Opsional)"
            value={longDesc}
            onChange={(e) => setLongDesc(e.target.value)}
          />

          <div>
            <label className="block mb-1 text-sm font-medium">Tipe Chapter</label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={type}
onChange={(e) =>
  setType(e.target.value as "video" | "module" | "pdf")
}            >
              <option value="video">Video</option>
              <option value="module">Gambar</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={loading}>
              Batal
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}