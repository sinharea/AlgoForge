"use client";

import { useEffect, useState } from "react";
import { getUser } from "../utils/auth";

export default function useAuth() {
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setReady(true);
  }, []);

  return { user, ready };
}
