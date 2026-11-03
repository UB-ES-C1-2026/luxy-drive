/** Solo rutas internas: un `?redirect=` nunca puede sacar al usuario de LuxyDrive. */
export function safeRedirect(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : undefined;
}
