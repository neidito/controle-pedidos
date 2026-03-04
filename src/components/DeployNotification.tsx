import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const POLL_INTERVAL = 60_000
const CURRENT_BUILD_ID = import.meta.env.VITE_BUILD_ID as string

export function DeployNotification() {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false)

  useEffect(() => {
    if (import.meta.env.DEV) return

    const check = async () => {
      try {
        const res = await fetch("/version.json", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (data.buildId && data.buildId !== CURRENT_BUILD_ID) {
          setNewVersionAvailable(true)
        }
      } catch {
        // Silently ignore network errors
      }
    }

    check()
    const interval = setInterval(check, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  if (!newVersionAvailable) return null

  return (
    <Dialog open>
      <DialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="[&>button:last-child]:hidden"
      >
        <DialogHeader>
          <DialogTitle>Atualização disponível</DialogTitle>
          <DialogDescription>
            Uma nova versão do sistema foi publicada. Recarregue a página para
            continuar usando.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
