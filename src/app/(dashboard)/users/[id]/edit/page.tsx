"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditUserRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/users/${id}`);
  }, [id, router]);

  return null;
}
