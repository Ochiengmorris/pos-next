"use client"

import { Spinner } from "./spinner"

export function LoadingSpinner() {
  return (
    <div className="flex h-64 items-center justify-center" role="status" aria-busy="true" aria-label="Loading">
      <Spinner className="size-8 text-primary" />
    </div>
  )
}