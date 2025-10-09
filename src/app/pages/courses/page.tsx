"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import Layout from "@/components/layout";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

type Course = {
  id: string;
  title: string;
  description: string;
  mentor: string;
  imageUrl: string;
  accessType?: "free" | "subscription" | "paid";
  isFree?: boolean;
  price?: number;
  materialType: string;
};

type ProfileData = {
  name: string;
  email: string;
  claimedCourses?: string[];
};

type SubscriptionDocLite = {
  status?: string;
  currentPeriodEnd?: { toMillis: () => number };
};

type CourseRequestStatus = {
  courseId: string;
  status: "pending" | "approved" | "rejected";
  finalPrice?: number;
  amount?: number;
  updatedAt?: number;
};

type CourseRequestMap = Record<string, CourseRequestStatus>;
type AccessFilter = "all" | "free" | "subscription" | "paid";

export default function CoursesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [claiming, setClaiming] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sub, setSub] = useState<SubscriptionDocLite | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "video" | "module">("all");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [chapterPreview, setChapterPreview] = useState<
    Record<string, { id: string; title: string; description?: string }[]>
  >({});
  const [courseRequests, setCourseRequests] = useState<CourseRequestMap>({});

  useEffect(() => {
    if (!user) {
      setIsAuthenticated(false);
      setProfile(null);
      setCourses([]);
      setSub(null);
      setCourseRequests({});
      return;
    }

    setIsAuthenticated(true);

    let unsubProfile: (() => void) | null = null;
    let unsubSubscription: (() => void) | null = null;
    let unsubCourseRequests: (() => void) | null = null;

    const userRef = doc(db, "users", user.uid);

    const loadCourses = async () => {
      const snapCourses = await getDocs(collection(db, "courses"));
      const data: Course[] = snapCourses.docs.map((docSnap) => {
        const raw = docSnap.data() as Record<string, unknown>;
        const price =
          typeof raw.price === "number"
            ? raw.price
            : typeof raw.price === "string"
            ? Number(raw.price)
            : 0;
        return {
          id: docSnap.id,
          title: (raw.title as string) ?? "",
          description: (raw.description as string) ?? "",
          mentor: (raw.mentor as string) ?? "",
          imageUrl: (raw.imageUrl as string) ?? "",
          materialType: (raw.materialType as string) ?? "video",
          accessType: raw.accessType as Course["accessType"],
          isFree: typeof raw.isFree === "boolean" ? raw.isFree : undefined,
          price: Number.isFinite(price) ? price : 0,
        };
      });
      setCourses(data);
    };

    const init = async () => {
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(
          userRef,
          {
            name: user.displayName || "",
            email: user.email || "",
            claimedCourses: [],
          },
          { merge: true },
        );
      } else {
        setProfile(userSnap.data() as ProfileData);
      }

      unsubProfile = onSnapshot(userRef, (profileSnap) => {
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as ProfileData);
        }
      });

      await loadCourses();

      unsubSubscription = onSnapshot(doc(db, "subscriptions", user.uid), (snap) => {
        setSub((snap.data() as SubscriptionDocLite) ?? null);
      });

      const requestQuery = query(
        collection(db, "course_purchase_requests"),
        where("uid", "==", user.uid),
      );
      unsubCourseRequests = onSnapshot(requestQuery, (snap) => {
        const map: CourseRequestMap = {};
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const courseId = typeof data.courseId === "string" ? data.courseId : undefined;
          if (!courseId) return;
          const status = data.status === "approved" || data.status === "rejected" ? data.status : "pending";
          const updatedAtRaw = data.updatedAt;
          const updatedAt =
            typeof updatedAtRaw === "number"
              ? updatedAtRaw
              : updatedAtRaw && typeof (updatedAtRaw as { toMillis?: () => number }).toMillis === "function"
              ? (updatedAtRaw as { toMillis: () => number }).toMillis()
              : undefined;
          map[courseId] = {
            courseId,
            status,
            finalPrice: typeof data.finalPrice === "number" ? data.finalPrice : undefined,
            amount: typeof data.amount === "number" ? data.amount : undefined,
            updatedAt,
          };
        });
        setCourseRequests(map);
      });
    };

    void init();

    return () => {
      unsubProfile?.();
      unsubSubscription?.();
      unsubCourseRequests?.();
    };
  }, [user]);

  const subActive = useMemo(() => {
    if (!sub || sub.status !== "active") return false;
    const end = sub.currentPeriodEnd?.toMillis?.() ?? 0;
    return end >= Date.now();
  }, [sub]);

  const resolveAccessType = (course: Course): "free" | "subscription" | "paid" => {
    return course.accessType ?? (course.isFree ? "free" : "subscription");
  };

  const formatAccessLabel = (course: Course) => {
    const access = resolveAccessType(course);
    if (access === "free") return "Gratis";
    if (access === "subscription") return "Khusus Subscriber";
    const price = Math.max(0, course.price ?? 0);
    return `Berbayar • Rp ${price.toLocaleString("id-ID")}`;
  };

  const handleClaim = async (course: Course) => {
    if (!user) return;

    const access = resolveAccessType(course);
    const request = courseRequests[course.id];

    if (access === "paid") {
      if (request?.status === "pending") {
        toast.info("Permintaan pembelian kamu masih diproses admin.");
        return;
      }
      router.push(`/pages/courses/pay/${course.id}`);
      return;
    }

    if (!profile) return;

    if (access === "subscription" && !subActive) {
      toast.error("Kelas ini khusus pelanggan aktif. Silakan aktifkan langganan terlebih dahulu.");
      return;
    }

    try {
      setClaiming(course.id);
      const userRef = doc(db, "users", user.uid);
      const claimed = new Set(profile.claimedCourses || []);
      claimed.add(course.id);

      await setDoc(
        userRef,
        { claimedCourses: Array.from(claimed) },
        { merge: true },
      );

      setProfile((prev) =>
        prev ? { ...prev, claimedCourses: Array.from(claimed) } : prev,
      );
      toast.success("Berhasil mengikuti kelas!");
    } catch (err) {
      console.error("Gagal claim:", err);
      toast.error("Gagal mengikuti kelas.");
    } finally {
      setClaiming("");
    }
  };

  const fetchChaptersOnce = async (course: Course) => {
    if (chapterPreview[course.id]) return;
    setLoadingDetail(true);
    try {
      const snap = await getDocs(collection(db, "courses", course.id, "chapters"));
      const previews = snap.docs
        .map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const rawCreatedAt = data.createdAt;
          let orderValue = Number.MAX_SAFE_INTEGER;

          if (typeof rawCreatedAt === "number") {
            orderValue = rawCreatedAt;
          } else if (rawCreatedAt instanceof Date) {
            orderValue = rawCreatedAt.getTime();
          } else if (
            rawCreatedAt &&
            typeof (rawCreatedAt as { toMillis?: () => number }).toMillis === "function"
          ) {
            orderValue = (rawCreatedAt as { toMillis: () => number }).toMillis();
          }

          return {
            orderValue,
            preview: {
              id: docSnap.id,
              title: typeof data.title === "string" ? data.title : "Chapter tanpa judul",
              description:
                typeof data.shortDesc === "string"
                  ? data.shortDesc
                  : typeof data.description === "string"
                  ? data.description
                  : undefined,
            },
          };
        })
        .sort((a, b) => a.orderValue - b.orderValue)
        .map((entry) => entry.preview);

      setChapterPreview((prev) => ({
        ...prev,
        [course.id]: previews,
      }));
    } catch (err) {
      console.error("Gagal memuat chapter:", err);
      toast.error("Gagal memuat detail kelas.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const openCourseDetail = (course: Course) => {
    setSelectedCourse(course);
    setDetailOpen(true);
    void fetchChaptersOnce(course);
  };

  const closeCourseDetail = (openState: boolean) => {
    setDetailOpen(openState);
    if (!openState) {
      setSelectedCourse(null);
    }
  };

  if (loading)
    return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!isAuthenticated)
    return (
      <div className="flex items-center justify-center h-screen flex-col">
        <p className="text-center mb-2">Kamu belum login. Silakan login terlebih dahulu.</p>
        <Link href="/auth/login" className="text-blue-500 hover:underline">
          Ke Halaman Login
        </Link>
      </div>
    );

  const claimed = profile?.claimedCourses || [];
  const normalized = (s: string) => s.toLowerCase();
  const filteredCourses = courses.filter((c) => {
    const matchesSearch = !search
      ? true
      : [c.title, c.description, c.mentor].some((x) => normalized(x || "").includes(normalized(search)));
    const matchesType = typeFilter === "all" ? true : c.materialType === typeFilter;
    const access = resolveAccessType(c);
    const matchesAccess =
      accessFilter === "all"
        ? true
        : accessFilter === "free"
        ? access === "free"
        : accessFilter === "subscription"
        ? access === "subscription"
        : access === "paid";
    return matchesSearch && matchesType && matchesAccess;
  });

  return (
    <Layout pageTitle="Kelas Kamu">
      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold mb-4">Kelas yang Kamu Ikuti</h2>
          {claimed.length === 0 ? (
            <div className="p-6 flex flex-col items-center text-center text-gray-500">
              <p>Kamu belum mengikuti kelas apapun.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {courses
                .filter((c) => claimed.includes(c.id))
                .map((course) => (
                  <Link key={course.id} href={`/pages/courses/${course.id}`} className="block">
                    <Card className="flex flex-col h-full p-4 cursor-pointer hover:shadow-lg transition">
                      <div className="relative w-full h-40 rounded-md overflow-hidden mb-3 bg-muted">
                        <Image
                          src={course.imageUrl || "/photos/working.jpg"}
                          alt={course.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          priority={false}
                        />
                        {(() => {
                          const access = resolveAccessType(course);
                          const badge =
                            access === "subscription"
                              ? "Subscriber"
                              : access === "paid"
                              ? "Berbayar"
                              : null;
                          return badge ? (
                            <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-semibold px-2 py-1 rounded">
                              {badge}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <h3 className="text-lg font-semibold leading-snug min-h-[48px]">{course.title}</h3>
                      <div className="text-xs text-gray-500 mt-1">
                        Mentor: {course.mentor} • {course.materialType} • {formatAccessLabel(course)}
                      </div>
                      <div className="flex-1" />
                      <div className="mt-3 flex items-center justify-end">
                        <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-neutral-50 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 pointer-events-none">
                          <CheckCircle className="h-4 w-4" />
                          Buka Kelas
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Daftar Kelas Tersedia</h2>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul, deskripsi, atau mentor..."
              className="col-span-1 md:col-span-2 border rounded-md px-3 py-2"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | "video" | "module")}
              className="border rounded-md px-3 py-2"
            >
              <option value="all">Semua Tipe</option>
              <option value="video">Video</option>
              <option value="module">E-Module</option>
            </select>
            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value as AccessFilter)}
              className="border rounded-md px-3 py-2"
            >
              <option value="all">Semua Akses</option>
              <option value="free">Gratis</option>
              <option value="subscription">Khusus Subscriber</option>
              <option value="paid">Berbayar Manual</option>
            </select>
          </div>
          {courses.length === 0 ? (
            <div className="p-6 flex flex-col items-center text-center text-gray-500">
              <p>Belum ada kelas tersedia saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {filteredCourses.map((course) => {
                const accessType = resolveAccessType(course);
                const request = courseRequests[course.id];
                const isClaimed = claimed.includes(course.id);
                const isClaimingThis = claiming === course.id;
                const basePrice = Math.max(0, course.price ?? 0);
                const discountEligible = subActive && basePrice > 0;
                const discountValue = discountEligible ? 5000 : 0;
                const finalPrice = Math.max(0, basePrice - discountValue);
                const priceDisplay =
                  finalPrice > 0
                    ? `Rp ${finalPrice.toLocaleString("id-ID")}`
                    : "Gratis (diskon langganan)";
                const isPendingPurchase = request?.status === "pending";
                const badge =
                  accessType === "subscription"
                    ? "Subscriber"
                    : accessType === "paid"
                    ? "Berbayar"
                    : null;

                return (
                  <Card key={course.id} className="flex flex-col h-full p-4">
                    <div className="relative w-full h-40 rounded-md overflow-hidden mb-3 bg-muted">
                      <Image
                        src={course.imageUrl || "/photos/working.jpg"}
                        alt={course.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                        priority={false}
                      />
                      {badge ? (
                        <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-semibold px-2 py-1 rounded">
                          {badge}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-lg font-semibold leading-snug min-h-[48px]">{course.title}</h3>
                    <div className="text-xs text-gray-500 mt-1">
                      Mentor: {course.mentor} • {course.materialType} • {formatAccessLabel(course)}
                    </div>
                    <div className="flex-1" />
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        {isClaimed ? (
                          <Button asChild variant="secondary" className="flex-1">
                            <Link href={`/pages/courses/${course.id}`} className="inline-flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Buka Kelas
                            </Link>
                          </Button>
                        ) : accessType === "free" ? (
                          <Button
                            className="flex-1"
                            onClick={() => handleClaim(course)}
                            disabled={isClaimingThis}
                          >
                            {isClaimingThis ? "Mengikuti..." : "Ikuti Kelas"}
                          </Button>
                        ) : accessType === "subscription" ? (
                          subActive ? (
                            <Button
                              className="flex-1"
                              onClick={() => handleClaim(course)}
                              disabled={isClaimingThis}
                            >
                              {isClaimingThis ? "Mengikuti..." : "Ikuti Kelas"}
                            </Button>
                          ) : (
                            <Button className="flex-1 cursor-not-allowed" disabled>
                              <span className="inline-flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                Terkunci
                              </span>
                            </Button>
                          )
                        ) : (
                          <Button
                            className="flex-1"
                            onClick={() => handleClaim(course)}
                            disabled={isPendingPurchase}
                          >
                            {isPendingPurchase
                              ? "Menunggu Konfirmasi"
                              : `${request?.status === "rejected" ? "Ajukan Ulang" : "Ajukan Pembelian"} ${priceDisplay}`}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openCourseDetail(course)}
                        >
                          Detail Kelas
                        </Button>
                      </div>
                      {accessType === "subscription" && !subActive && !isClaimed && (
                        <Link
                          href="/pages/subscription"
                          className="text-blue-600 text-xs underline whitespace-nowrap"
                        >
                          Langganan untuk akses
                        </Link>
                      )}
                      {accessType === "paid" && isPendingPurchase && (
                        <p className="text-xs text-amber-600">
                          Permintaan pembelianmu sedang menunggu persetujuan admin.
                        </p>
                      )}
                      {accessType === "paid" && request?.status === "rejected" && (
                        <p className="text-xs text-rose-600">
                          Permintaan sebelumnya ditolak. Ajukan ulang setelah pembayaran ulang.
                        </p>
                      )}
                      {accessType === "paid" && discountEligible && !isClaimed && !isPendingPurchase && (
                        <p className="text-xs text-emerald-600">
                          Langganan aktif: hemat Rp 5.000 dari harga normal Rp {basePrice.toLocaleString("id-ID")}.
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <Dialog open={detailOpen} onOpenChange={closeCourseDetail}>
        <DialogContent className="sm:max-w-xl">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCourse.title}</DialogTitle>
                <DialogDescription>
                  Mentor: {selectedCourse.mentor} • {selectedCourse.materialType} • {formatAccessLabel(selectedCourse)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedCourse.description}</p>
                {resolveAccessType(selectedCourse) === "paid" && (
                  <div className="rounded-md border bg-muted/20 p-4 space-y-1 text-sm">
                    <p>
                      Harga normal:{" "}
                      <span className="font-semibold">
                        Rp {Math.max(0, selectedCourse.price ?? 0).toLocaleString("id-ID")}
                      </span>
                    </p>
                    {subActive ? (
                      <p className="text-emerald-600">
                        Diskon subscriber Rp 5.000 →{" "}
                        <span className="font-semibold">
                          {Math.max(0, (selectedCourse.price ?? 0) - 5000).toLocaleString("id-ID")}
                        </span>
                      </p>
                    ) : (
                      <p>Nominal yang perlu dibayar mengikuti harga normal di atas.</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Setelah men-transfer, ajukan bukti pembayaran. Admin akan menyetujui sebelum akses diberikan.
                    </p>
                  </div>
                )}
                <div className="rounded-md border bg-muted/30 p-4">
                  <p className="text-sm font-semibold mb-2">Preview Chapter</p>
                  {loadingDetail ? (
                    <p className="text-sm text-muted-foreground">Memuat detail kelas...</p>
                  ) : chapterPreview[selectedCourse.id] && chapterPreview[selectedCourse.id].length > 0 ? (
                    <ol className="space-y-2 list-decimal pl-4">
                      {chapterPreview[selectedCourse.id].map((chapter) => (
                        <li key={chapter.id} className="text-sm">
                          <span className="font-medium text-foreground">{chapter.title}</span>
                          {chapter.description && (
                            <p className="text-xs text-muted-foreground mt-1">{chapter.description}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada chapter yang tersedia.</p>
                  )}
                </div>
              </div>
              <DialogFooter className="sm:justify-between">
                <div className="text-xs text-muted-foreground space-y-1">
                  {(() => {
                    const accessType = resolveAccessType(selectedCourse);
                    const request = courseRequests[selectedCourse.id];
                    if (accessType === "free") {
                      return <span>Kelas dapat diikuti gratis.</span>;
                    }
                    if (accessType === "subscription") {
                      return (
                        <span>
                          {subActive
                            ? "Langgananmu aktif, kamu bisa langsung mengikuti kelas ini."
                            : "Kelas ini memerlukan langganan aktif sebelum dapat diikuti."}
                        </span>
                      );
                    }
                    return (
                      <>
                        <span>Ajukan pembelian dengan mengunggah bukti transfer.</span>
                        {request?.status === "pending" && (
                          <span className="text-amber-600">Status saat ini: menunggu persetujuan admin.</span>
                        )}
                        {request?.status === "rejected" && (
                          <span className="text-rose-600">
                            Pengajuan sebelumnya ditolak. Ajukan ulang jika sudah melengkapi pembayaran.
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                {(() => {
                  const accessType = resolveAccessType(selectedCourse);
                  const request = courseRequests[selectedCourse.id];
                  const isClaimed = claimed.includes(selectedCourse.id);
                  const isPending = request?.status === "pending";
                  const isRejected = request?.status === "rejected";
                  const currentClaiming = claiming === selectedCourse.id;
                  if (isClaimed) {
                    return (
                      <Button asChild>
                        <Link href={`/pages/courses/${selectedCourse.id}`}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Buka Kelas
                        </Link>
                      </Button>
                    );
                  }
                  if (accessType === "free") {
                    return (
                      <Button onClick={() => handleClaim(selectedCourse)} disabled={currentClaiming}>
                        {currentClaiming ? "Mengikuti..." : "Ikuti Kelas"}
                      </Button>
                    );
                  }
                  if (accessType === "subscription") {
                    if (!subActive) {
                      return (
                        <div className="flex items-center gap-3">
                          <Button disabled className="cursor-not-allowed">
                            <span className="inline-flex items-center gap-2">
                              <Lock className="h-4 w-4" />
                              Terkunci
                            </span>
                          </Button>
                          <Link href="/pages/subscription" className="text-xs text-blue-600 underline whitespace-nowrap">
                            Langganan sekarang
                          </Link>
                        </div>
                      );
                    }
                    return (
                      <Button onClick={() => handleClaim(selectedCourse)} disabled={currentClaiming}>
                        {currentClaiming ? "Mengikuti..." : "Ikuti Kelas"}
                      </Button>
                    );
                  }
                  const basePrice = Math.max(0, selectedCourse.price ?? 0);
                  const discountEligible = subActive && basePrice > 0;
                  const finalPrice = Math.max(0, basePrice - (discountEligible ? 5000 : 0));
                  const priceDisplay =
                    finalPrice > 0
                      ? `Rp ${finalPrice.toLocaleString("id-ID")}`
                      : "Gratis (diskon langganan)";
                  if (isPending) {
                    return <Button disabled>Menunggu Konfirmasi</Button>;
                  }
                  return (
                    <Button onClick={() => handleClaim(selectedCourse)}>
                      {`${isRejected ? "Ajukan Ulang" : "Ajukan Pembelian"} ${priceDisplay}`}
                    </Button>
                  );
                })()}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
