"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DocumentsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dang-ky-tai-xe"); }, [router]);
  return null;
}
