"use client";

import { useContext } from "react";
import { ReaderContext } from "@/components/voice/ReaderProvider";

export const useReader = () => useContext(ReaderContext);
