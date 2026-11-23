import { Button, Dialog, Notice, Text } from "@luxydrive/ui";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { client } from "./api";

/** "Retirar anuncio" con confirmación. El anuncio no se borra: deja de ofrecerse. */
export function WithdrawListing({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [failed, setFailed] = useState(false);

  const withdraw = async () => {
    setFailed(false);
    setWithdrawing(true);
    try {
      const res = await client.api.provider.experiences[":id"].withdraw.$post({
        param: { id: String(id) },
      });
      const status: number = res.status;
      // 409: ya estaba retirado (por ejemplo, desde otra pestaña). Basta con recargar.
      if (res.ok || status === 409) {
        setOpen(false);
        return await router.invalidate();
      }
      setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Retirar anuncio
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="¿Retirar este anuncio?"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setOpen(false)} disabled={withdrawing}>
              Cancelar
            </Button>
            <Button onClick={withdraw} disabled={withdrawing}>
              {withdrawing ? "Retirando…" : "Sí, retirar"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Text className="break-words">
            «{title}» dejará de aparecer en el catálogo y en las ofertas. Seguirás viéndolo en tus
            anuncios como retirado, pero no podrás volver a publicarlo.
          </Text>
          {failed && (
            <Notice tone="error" title="No se ha podido retirar">
              Comprueba tu conexión e inténtalo de nuevo. El anuncio sigue publicado.
            </Notice>
          )}
        </div>
      </Dialog>
    </>
  );
}
